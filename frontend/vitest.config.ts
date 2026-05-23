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
        lines: 50,
        statements: 50,
        branches: 70,
        functions: 35,
      },
      exclude: [
        '**/tests/e2e/**',
        '**/*.config.*',
        '**/.next/**',
        '**/node_modules/**',
        '**/*.test.*',
        '**/*.spec.*',
        'src/types/**',
        '**/*.d.ts',
        'src/instrumentation.ts',
        'src/app/layout.tsx',
        'next-env.d.ts',
      ],
    },
  },
})
