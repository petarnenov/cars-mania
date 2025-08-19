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
			},
		},
	},

		test: {
			environment: 'jsdom',
			setupFiles: ['./vitest.setup.ts'],
			coverage: {
				reporter: ['text', 'html'],
				provider: 'v8',
				thresholds: {
					statements: 65,
					branches: 65,
					functions: 65,
					lines: 65,
				},
				exclude: [
					'*.ts',
					'**/*.ts',
					'!src/**/*.ts',
					'*.js',
					'**/*.js',
					'!src/**/*.js',
					'*.cjs',
					'**/*.cjs',
					'!src/**/*.cjs',
					'**/assets/**',
					'e2e/**',
					'tests-e2e/**',
					'node_modules/**',
					'coverage/**',
					'dist/**',
				],
			},
			exclude: [...configDefaults.exclude, 'e2e/**', 'tests-e2e/**'],
		},
})
