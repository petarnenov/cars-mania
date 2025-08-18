import { expect, test } from '@playwright/test'

test.describe('Cars Mania smoke flow', () => {
	test('guest can browse, register/login, create draft, and see route toasts', async ({ page }) => {
		await page.goto('/')
		await expect(page.getByText('Catalog')).toBeVisible()

		// Navigate to login, then to register
		await page.getByRole('link', { name: 'Login' }).click()
		await expect(page.getByText('Navigated to /login')).toBeVisible()
		await page.getByRole('link', { name: 'Register' }).click()
		await expect(page.getByText('Navigated to /register')).toBeVisible()

		// Register
		const email = `e2e_${Date.now()}@test.dev`
		await page.getByLabel('Email').fill(email)
		await page.getByLabel('Password').fill('123456')
		await page.getByLabel('Name').fill('E2E User')
		await page.getByRole('button', { name: /register/i }).click()
		await expect(page.getByText('Navigated to /cars/new')).toBeVisible()

		// Create a draft (minimal fields)
		await page.getByLabel('Brand').fill('E2E')
		await page.getByLabel('Model').fill('Test')
		await page.getByLabel('First registration').fill('2020-01-01')
		await page.getByLabel('Color').fill('Blue')
		await page.getByLabel('Price').fill('12345')
		await page.getByLabel('Description').fill('Playwright draft')
		await page.getByRole('button', { name: /create draft/i }).click()
		await expect(page.getByText('Draft created')).toBeVisible()

		// Go to inbox and back to verify toasts
		await page.getByRole('link', { name: 'Inbox' }).click()
		await expect(page.getByText('Navigated to /inbox')).toBeVisible()
		await page.getByRole('link', { name: 'Catalog' }).click()
		await expect(page.getByText('Navigated to /')).toBeVisible()
	})
})


