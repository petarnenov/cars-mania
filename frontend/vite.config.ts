import { defineConfig } from 'vite'
// @ts-ignore
import { configDefaults } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
	plugins: [vue()],
	server: {
		proxy: {
			'/api': {
				target: process.env.BACKEND_URL || 'http://localhost:3001',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ''),
			},
		},
	},

	test: {
		environment: 'jsdom',
		setupFiles: ['./vitest.setup.ts'],
		coverage: {
			reporter: ['text', 'html'],
			provider: 'v8',
		},
		exclude: [...configDefaults.exclude, 'e2e/**', 'tests-e2e/**'],
	},
})
