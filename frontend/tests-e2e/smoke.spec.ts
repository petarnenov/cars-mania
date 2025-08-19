import { expect, test } from '@playwright/test'

test.describe('Cars Mania smoke flow', () => {
	test('guest can browse, register/login, create draft, and see route toasts', async ({ page }) => {
		await page.goto('/')
		await expect(page.getByText('Catalog')).toBeVisible()

		// Navigate to login, then to register
		await page.getByRole('navigation').getByRole('link', { name: 'Login' }).click()
		await expect(page.getByText('Navigated to /login')).toBeVisible()
		await page.getByRole('navigation').getByRole('link', { name: 'Register' }).click()
		await expect(page.getByText('Navigated to /register')).toBeVisible()

		// Register
		const email = `e2e_${Date.now()}@test.dev`
		// Register inputs are rendered in label/input pairs; select inputs by their position
		const regForm = page.locator('form')
		await regForm.locator('input[type="text"]').first().fill('E2E User')
		await regForm.locator('input[type="email"]').fill(email)
		await regForm.locator('input[type="password"]').fill('123456')
		
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

		// Create a draft (minimal fields)
		const draftForm = page.locator('form')
		await draftForm.locator('input').nth(0).fill('E2E') // Brand
		await draftForm.locator('input').nth(1).fill('Test') // Model
		await draftForm.locator('input[type="date"]').fill('2020-01-01') // First registration
		await draftForm.locator('input').nth(3).fill('Blue') // Color
		await draftForm.locator('input[type="number"]').fill('12345') // Price
		await draftForm.locator('textarea').fill('Playwright draft') // Description
		await page.getByRole('button', { name: /create draft/i }).click()
		await expect(page.getByText('Draft created')).toBeVisible()

		// Go to inbox and back to verify toasts
		await page.getByRole('navigation').getByRole('link', { name: 'Inbox' }).click()
		await expect(page.locator('.toaster .toast.info .msg', { hasText: 'Navigated to /inbox' }).last()).toBeVisible()
		await page.getByRole('navigation').getByRole('link', { name: 'Catalog' }).click()
		await expect(page.locator('.toaster .toast.info .msg', { hasText: 'Navigated to /' }).last()).toBeVisible()
	})
})


