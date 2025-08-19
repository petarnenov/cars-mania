/// <reference types="node" />
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
	reporter: [['list'], ['html', { open: 'never' }]],
	testDir: 'tests-e2e',
	globalSetup: process.env.E2E_DOCKER === '1' ? undefined : './tests-e2e/global-setup.ts',
	globalTeardown: process.env.E2E_DOCKER === '1' ? undefined : './tests-e2e/global-teardown.ts',
	use: {
		baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
		headless: process.env.HEADLESS !== 'false',
		trace: process.env.E2E_VERBOSE === '1' ? 'on' : 'retain-on-failure',
		video: process.env.E2E_VERBOSE === '1' ? 'on' : 'retain-on-failure',
		screenshot: process.env.E2E_VERBOSE === '1' ? 'on' : 'only-on-failure',
		launchOptions: { slowMo: Number(process.env.SLOWMO || '0') },
	},
	webServer: process.env.E2E_DOCKER === '1'
		? undefined
		: {
			command: 'npm run dev',
			url: 'http://localhost:5173',
			env: { BACKEND_URL: process.env.BACKEND_URL || 'http://127.0.0.1:3001' },
			reuseExistingServer: true,
			timeout: 60_000,
		},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
	],
})


