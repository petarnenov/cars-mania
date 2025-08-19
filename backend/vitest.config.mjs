/** @type {import('vitest').UserConfig} */
export default {
	test: {
		environment: 'node',
		setupFiles: ['./tests/setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'html'],
			include: ['src/**/*.ts'],
			exclude: [
				'src/generated/**',
				'src/generated/prisma/**',
				'src/config/**',
				'src/routes/**',
				'src/middleware/**',
				'scripts/**',
				'dist/**',
				'**/*.d.ts',
				'tests/**',
				'src/index.ts',
			],
			thresholds: {
				statements: 70,
				branches: 55,
				functions: 70,
				lines: 70,
			},
		},
	},
}


