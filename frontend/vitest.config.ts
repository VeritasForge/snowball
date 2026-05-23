import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vitest-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text'],
      thresholds: {
        lines: 100,
        statements: 100,
        branches: 100,
        functions: 100,
      },
      exclude: [
        '**/tests/e2e/**',
        '**/*.config.*',
        '**/.next/**',
        '**/node_modules/**',
        '**/*.test.*',
        '**/*.spec.*',
        'src/types/**',
        'src/types.ts',
        '**/*.d.ts',
        'src/instrumentation.ts',
        'src/app/layout.tsx',
        'src/app/auth/page.tsx',
        'src/mocks/**',
        'next-env.d.ts',
      ],
    },
  },
})
