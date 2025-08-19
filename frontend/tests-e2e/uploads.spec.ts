import { test, expect } from '@playwright/test'

function filePayload(name: string, mimeType = 'image/png', content = 'iVBORw0KGgo=') {
  return { name, mimeType, buffer: Buffer.from(content, 'base64') }
}

async function createDraft(page: any) {
  await page.goto('/register')
  const email = `u_${Date.now()}@test.dev`
  await page.locator('form input[type="text"]').first().fill('Uploader')
  await page.locator('form input[type="email"]').fill(email)
  await page.locator('form input[type="password"]').fill('123456')
  
  // Click the register button and wait for navigation
  await page.getByRole('button', { name: /create account/i }).click()
  
  // Wait for either success toast or error
  await page.waitForFunction(() => {
    const toasts = document.querySelectorAll('.toaster .toast')
    return toasts.length > 0
  }, { timeout: 10000 })
  
  // Check if registration was successful
  const successToast = page.locator('.toaster .toast.success')
  const errorToast = page.locator('.toaster .toast.error')
  
  await expect(successToast.or(errorToast)).toBeVisible({ timeout: 5000 })
  
  // If there's an error, log it and fail the test
  if (await errorToast.isVisible()) {
    const errorText = await errorToast.textContent()
    console.log('Registration error:', errorText)
    throw new Error(`Registration failed: ${errorText}`)
  }
  
  // Wait for navigation to cars/new
  await page.waitForURL('**/cars/new', { timeout: 15000 })
  await expect(page.getByRole('heading', { name: 'New Car' })).toBeVisible()

  const form = page.locator('form')
  await form.locator('input').nth(0).fill('UploadBrand')
  await form.locator('input').nth(1).fill('UploadModel')
  await form.locator('input[type="date"]').fill('2020-01-01')
  await form.locator('input').nth(3).fill('Red')
  await form.locator('input[type="number"]').fill('12345')
  await form.locator('textarea').fill('Upload test draft')
  await page.getByRole('button', { name: /create draft/i }).click()
  await expect(page.locator('text=Created draft:')).toBeVisible()
}

test.describe('Uploads', () => {
  test('uploads single image', async ({ page }) => {
    await createDraft(page)

    const input = page.locator('.uploader input[type="file"]')
    await input.setInputFiles([filePayload('one.png')])
    await page.getByRole('button', { name: /upload up to 3 images/i }).click()
    await expect(page.locator('.toaster .toast.success .msg').last()).toContainText('Images uploaded')
  })

  test('uploads max 3 when 4 selected', async ({ page }) => {
    await createDraft(page)

    const input = page.locator('.uploader input[type="file"]')
    await input.setInputFiles([
      filePayload('1.png'),
      filePayload('2.png'),
      filePayload('3.png'),
      filePayload('4.png'),
    ])
    await page.getByRole('button', { name: /upload up to 3 images/i }).click()
    await expect(page.locator('.toaster .toast.success .msg').last()).toContainText('Images uploaded')
  })
})


