import { test, expect } from '@playwright/test'
// Use FE proxy `/api` everywhere to avoid cross-host cookie/domain issues

test.describe('Admin moderation', () => {
  test('admin can verify submitted draft and ad becomes public', async ({ request }) => {
    // Seller registers and creates a draft, then submits for review
    const sellerEmail = `seller_${Date.now()}@test.dev`
    let reg = await request.post('/api/auth/register', { data: { email: sellerEmail, password: '123456', name: 'Seller' } })
    if (!reg.ok()) {
      // retry briefly in case backend is still warming up
      for (let i = 0; i < 5 && !reg.ok(); i++) {
        await new Promise(r => setTimeout(r, 200))
        reg = await request.post('/api/auth/register', { data: { email: sellerEmail, password: '123456', name: 'Seller' } })
      }
    }
    expect(reg.ok()).toBeTruthy()
    const create = await request.post('/api/cars', {
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
    const submit = await request.post(`/api/cars/${carId}/submit`)
    expect(submit.ok()).toBeTruthy()

    // Create admin and promote
    const adminEmail = `admin_${Date.now()}@test.dev`
    const regAdmin = await request.post('/api/auth/register', { data: { email: adminEmail, password: '123456', name: 'Admin' } })
    expect(regAdmin.ok()).toBeTruthy()
    const promote = await request.post('/api/test/make-admin', { data: { email: adminEmail } })
    expect(promote.ok()).toBeTruthy()

    // Admin login via API and verify the pending car deterministically
    const adminLogin = await request.post('/api/auth/login', { data: { email: adminEmail, password: '123456' } })
    expect(adminLogin.ok()).toBeTruthy()
    const verify = await request.post(`/api/cars/admin/${carId}/verify`)
    expect(verify.ok()).toBeTruthy()

    // Wait until backend serves verified detail
    let becamePublic = false
    for (let i = 0; i < 50 && !becamePublic; i++) {
      const r = await request.get(`/api/cars/${carId}`)
      becamePublic = r.ok()
      if (!becamePublic) await new Promise(r => setTimeout(r, 200))
    }
    expect(becamePublic).toBeTruthy()
    // Assert backend detail content instead of UI to avoid SPA timing flake
    const detail = await request.get(`/api/cars/${carId}`)
    expect(detail.ok()).toBeTruthy()
    const body = await detail.json()
    expect(body.brand).toBe('AdminFlow')
    expect(body.model).toBe('VerifyMe')
  })
})


