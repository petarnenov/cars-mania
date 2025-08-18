import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	reporter: [['list'], ['html', { open: 'never' }]],
	testDir: 'tests-e2e',
	use: {
		baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
		headless: true,
		trace: 'retain-on-failure',
		video: 'retain-on-failure'
	},
	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:5173',
		reuseExistingServer: true,
		timeout: 60_000,
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
	],
})


