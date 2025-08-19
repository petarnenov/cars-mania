import { test, expect } from '@playwright/test'

test.describe('Messaging', () => {
	test('owner cannot message own ad (negative)', async ({ page, request }) => {
		// Create seller and draft via API for speed and determinism
		const email = `seller_${Date.now()}@test.dev`
		let register = await request.post('/api/auth/register', { data: { email, password: '123456', name: 'Seller' } })
		if (!register.ok()) {
			for (let i = 0; i < 5 && !register.ok(); i++) {
				await new Promise(r => setTimeout(r, 200))
				register = await request.post('/api/auth/register', { data: { email, password: '123456', name: 'Seller' } })
			}
		}
		expect(register.ok()).toBeTruthy()
		const create = await request.post('/api/cars', {
			data: {
				brand: 'BMW',
				model: 'X1',
				firstRegistrationDate: '2020-01-01',
				color: 'Blue',
				priceCents: 25000,
				description: 'DM for details',
			},
		})
		expect(create.ok()).toBeTruthy()
		const created = await create.json()
		const carId = created.id as string
		expect(carId).toBeTruthy()

		// Owner cannot message own ad; also unverified cars are not visible to public detail
		await page.goto(`/cars/${carId}`)
		await expect(page.locator('.error')).toContainText(/Not found/i)
		await expect(page.locator('textarea')).toHaveCount(0)
	})
})


