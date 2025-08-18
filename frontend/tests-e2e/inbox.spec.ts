import { test, expect, request as pwRequest } from '@playwright/test'

test.describe('Inbox end-to-end', () => {
  test('buyer and seller see conversation after message on verified ad', async ({ page, browser }) => {
    const api = await pwRequest.newContext({ baseURL: 'http://127.0.0.1:3301' })

    // Setup: seller creates draft and submit; admin promotes and verifies
    const sellerEmail = `seller_${Date.now()}@test.dev`
    const sellerReg = await api.post('/auth/register', { data: { email: sellerEmail, password: '123456', name: 'Seller' } })
    expect(sellerReg.ok()).toBeTruthy()
    const created = await api.post('/cars', {
      data: {
        brand: 'InboxBrand', model: 'InboxModel', firstRegistrationDate: '2020-01-01', color: 'Gray', priceCents: 11111, description: 'Inbox test'
      }
    })
    expect(created.ok()).toBeTruthy()
    const car = await created.json()
    const carId = car.id as string
    expect(carId).toBeTruthy()
    const submitted = await api.post(`/cars/${carId}/submit`)
    expect(submitted.ok()).toBeTruthy()

    const adminEmail = `admin_${Date.now()}@test.dev`
    const adminReg = await api.post('/auth/register', { data: { email: adminEmail, password: '123456', name: 'Admin' } })
    expect(adminReg.ok()).toBeTruthy()
    const promote = await api.post('/test/make-admin', { data: { email: adminEmail } })
    expect(promote.ok()).toBeTruthy()
    const adminLogin = await api.post('/auth/login', { data: { email: adminEmail, password: '123456' } })
    expect(adminLogin.ok()).toBeTruthy()
    const verified = await api.post(`/cars/admin/${carId}/verify`)
    expect(verified.ok()).toBeTruthy()

    // Buyer via UI: register, open car detail, send a message
    await page.goto('/register')
    const buyerEmail = `buyer_${Date.now()}@test.dev`
    await page.locator('form input[type="text"]').first().fill('Buyer')
    await page.locator('form input[type="email"]').fill(buyerEmail)
    await page.locator('form input[type="password"]').fill('123456')
    await page.getByRole('button', { name: /create account/i }).click()

    await page.goto(`/cars/${carId}`)
    await page.locator('textarea').fill('Is this still available?')
    await page.getByRole('button', { name: /send/i }).click()
    await expect(page.locator('.toaster .toast.success .msg').last()).toContainText(/Message sent/i)

    // Buyer inbox shows conversation
    await page.goto('/inbox')
    await expect(page.getByText('Conversations')).toBeVisible()
    const conv = page.locator('.sidebar ul li', { hasText: 'InboxBrand' })
    await expect(conv.first()).toBeVisible()
    // Ensure message bubble exists on buyer side
    const msgMe = page.locator('.messages .msg.me .body', { hasText: 'Is this still available?' })
    await expect(msgMe.first()).toBeVisible()

    // Seller logs in and sees incoming message
    const sellerCtx = await browser.newContext()
    const sellerPage = await sellerCtx.newPage()
    await sellerPage.goto('/login')
    await sellerPage.locator('form input[type="email"]').fill(sellerEmail)
    await sellerPage.locator('form input[type="password"]').fill('123456')
    await sellerPage.getByRole('button', { name: 'Login' }).click()
    await sellerPage.goto('/inbox')
    await expect(sellerPage.getByText('Conversations')).toBeVisible()
    const convSeller = sellerPage.locator('.sidebar ul li', { hasText: 'InboxBrand' })
    await expect(convSeller.first()).toBeVisible()
    const msgThem = sellerPage.locator('.messages .msg.them .body', { hasText: 'Is this still available?' })
    await expect(msgThem.first()).toBeVisible()
  })
})


