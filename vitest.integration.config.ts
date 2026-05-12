import { resolve } from 'node:path'

import { defineConfig } from 'vitest/config'

// Config separada para testes integrados (ADR-015 limitação reconhecida).
// Sobe Postgres real via testcontainers no globalSetup; cada teste roda
// contra container vivo com migrations aplicadas.
//
// Não compartilha com vitest.config.ts porque o ambiente difere:
// integração precisa de Node (não jsdom) e do globalSetup que sobe o
// container — caro em tempo, irrelevante para unit tests.

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.integration.test.ts'],
    exclude: ['node_modules', '.next'],
    globalSetup: ['./tests/integration/setup/container.ts'],
    // Container leva ~5s para subir; migrations ~2-3s. Testes individuais
    // são rápidos. testTimeout cobre casos onde o teste em si fizer setup
    // pesado de fixture.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
})
