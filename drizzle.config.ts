import { defineConfig } from 'drizzle-kit'

// Migrations são SQL puro gerado pelo Drizzle Kit em src/shared/db/migrations/.
// Nunca edite migrations via ORM — o Kit apenas gera, e nós revisamos o SQL resultante.
// Usa DIRECT_URL (conexão direta, sem pooling) para migrations.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/shared/db/schema.ts',
  out: './src/shared/db/migrations',
  dbCredentials: {
    url: process.env.NEON_DIRECT_URL as string,
  },
  verbose: true,
  strict: true,
})
