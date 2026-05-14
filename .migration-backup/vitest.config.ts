import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'ingestion/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: ['node_modules', '.next'],
    // Coverage cobre apenas o código razoavelmente testável sem DB/rede:
    // pure libs em src/lib/** (exceto queries e og), src/shared/trust/** e
    // mappers em ingestion/**/*-mapper.ts. Schemas Drizzle, queries, app pages,
    // components, OG routes e HTTP clients exigem integração — ficam de fora
    // pra que a métrica reflita a realidade do que está coberto por unit test.
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/**/*.ts',
        'src/shared/trust/**/*.ts',
        'ingestion/**/*-mapper.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts',
        'src/lib/queries/**',
        'src/lib/og/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
})
