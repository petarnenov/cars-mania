import { defineConfig } from 'vitest/config'

export default defineConfig({
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
        statements: 65,
        branches: 65,
        functions: 65,
        lines: 65,
      },
    },
  },
})


