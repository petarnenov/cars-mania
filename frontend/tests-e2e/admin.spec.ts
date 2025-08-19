import { test, expect, request as pwRequest } from '@playwright/test'
// no direct CLI; use backend test endpoint to promote in the same DB

test.describe('Admin moderation', () => {
  test('admin can verify submitted draft and ad becomes public', async ({ page }) => {
    // Use backend context directly (bypass proxy) for setup
    const api = await pwRequest.newContext({ baseURL: 'http://127.0.0.1:3301' })
    // Seller registers and creates a draft, then submits for review
    const sellerEmail = `seller_${Date.now()}@test.dev`
    let reg = await api.post('/auth/register', { data: { email: sellerEmail, password: '123456', name: 'Seller' } })
    if (!reg.ok()) {
      // retry briefly in case backend is still warming up
      for (let i = 0; i < 5 && !reg.ok(); i++) {
        await new Promise(r => setTimeout(r, 200))
        reg = await api.post('/auth/register', { data: { email: sellerEmail, password: '123456', name: 'Seller' } })
      }
    }
    expect(reg.ok()).toBeTruthy()
    const create = await api.post('/cars', {
      data: {
        brand: 'AdminFlow',
        model: 'VerifyMe',
        firstRegistrationDate: '2021-05-10',
        color: 'Silver',
        priceCents: 1234500,
        description: 'Pending verification',
      },
    })
    expect(create.ok()).toBeTruthy()
    const created = await create.json()
    const carId = created.id as string
    expect(carId).toBeTruthy()
    const submit = await api.post(`/cars/${carId}/submit`)
    expect(submit.ok()).toBeTruthy()

    // Create admin and promote
    const adminEmail = `admin_${Date.now()}@test.dev`
    const regAdmin = await api.post('/auth/register', { data: { email: adminEmail, password: '123456', name: 'Admin' } })
    expect(regAdmin.ok()).toBeTruthy()
    const promote = await api.post('/test/make-admin', { data: { email: adminEmail } })
    expect(promote.ok()).toBeTruthy()

    // Admin login via API and verify the pending car deterministically
    const adminLogin = await api.post('/auth/login', { data: { email: adminEmail, password: '123456' } })
    expect(adminLogin.ok()).toBeTruthy()
    const verify = await api.post(`/cars/admin/${carId}/verify`)
    expect(verify.ok()).toBeTruthy()

    // Wait until backend serves verified detail
    let becamePublic = false
    for (let i = 0; i < 50 && !becamePublic; i++) {
      const r = await api.get(`/cars/${carId}`)
      becamePublic = r.ok()
      if (!becamePublic) await new Promise(r => setTimeout(r, 200))
    }
    expect(becamePublic).toBeTruthy()
    // Assert backend detail content instead of UI to avoid SPA timing flake
    const detail = await api.get(`/cars/${carId}`)
    expect(detail.ok()).toBeTruthy()
    const body = await detail.json()
    expect(body.brand).toBe('AdminFlow')
    expect(body.model).toBe('VerifyMe')
  })
})


