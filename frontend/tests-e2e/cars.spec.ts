import { test, expect } from '@playwright/test'

test.describe('Cars flow', () => {
	test('user can register, create draft, and see it ready to submit', async ({ page }) => {
		await page.goto('/register')
		const email = `u_${Date.now()}@test.dev`
		await page.locator('form input[type="text"]').first().fill('User')
		await page.locator('form input[type="email"]').fill(email)
		await page.locator('form input[type="password"]').fill('123456')
		await page.getByRole('button', { name: /create account/i }).click()
		await expect(page.getByRole('heading', { name: 'New Car' })).toBeVisible()

		const form = page.locator('form')
		await form.locator('input').nth(0).fill('Audi')
		await form.locator('input').nth(1).fill('A4')
		await form.locator('input[type="date"]').fill('2019-06-01')
		await form.locator('input').nth(3).fill('White')
		await form.locator('input[type="number"]').fill('19999')
		await form.locator('textarea').fill('Nice car')
		await page.getByRole('button', { name: /create draft/i }).click()
		await expect(page.locator('.toaster .toast.success .msg', { hasText: 'Draft created' }).last()).toBeVisible()
		await expect(page.getByText('Upload up to 3 images')).toBeVisible()
		await expect(page.getByRole('button', { name: /submit for review/i })).toBeVisible()
	})

	test('create draft validation: missing price shows error', async ({ page }) => {
		await page.goto('/register')
		const email = `v_${Date.now()}@test.dev`
		await page.locator('form input[type="text"]').first().fill('User')
		await page.locator('form input[type="email"]').fill(email)
		await page.locator('form input[type="password"]').fill('123456')
		await page.getByRole('button', { name: /create account/i }).click()
		await expect(page.getByRole('heading', { name: 'New Car' })).toBeVisible()

		const form = page.locator('form')
		await form.locator('input').nth(0).fill('VW')
		await form.locator('input').nth(1).fill('Golf')
		await form.locator('input[type="date"]').fill('2018-01-01')
		await form.locator('input').nth(3).fill('Black')
		await form.locator('textarea').fill('No price provided')
		// Remove required attr to allow submit and exercise our client-side guard
		await page.evaluate(() => {
			const el = document.querySelector('input[type="number"]') as HTMLInputElement | null
			el?.removeAttribute('required')
		})
		await page.getByRole('button', { name: /create draft/i }).click()
		await expect(page.locator('.container p.error')).toContainText(/Price is required/i)
	})
})


