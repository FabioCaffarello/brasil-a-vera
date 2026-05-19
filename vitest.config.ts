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
        // Wave 10 Etapa 7.2 — agregadores semanais: queries.ts é
        // db-dependent (mesma justificativa de src/lib/queries/);
        // alertas-semanais.ts é orquestrador thin que chama essas
        // queries — testá-lo sem mock de db (proibido pela memória
        // feedback_db_testing.md) exigiria testcontainers, fora de
        // escopo da Wave 10. compose-markdown.ts (pure) PERMANECE
        // coberto e tem ~92% de coverage.
        'src/lib/aggregators/queries.ts',
        'src/lib/aggregators/alertas-semanais.ts',
        // Wave 10 Etapa 7.3 — resend-client: wrapper sobre SDK Resend
        // (HTTP externo). Testar exigiria mock de SDK ou injeção de
        // dependência — fora de escopo. Helper é fino e funcional
        // (sendEmail é um pass-through com tradução de erro).
        'src/lib/resend-client.ts',
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
