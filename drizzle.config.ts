import dotenv from 'dotenv'
import { defineConfig } from 'drizzle-kit'

dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/shared/db/schema.ts',
  out: './src/shared/db/migrations',
  dbCredentials: {
    url: process.env.DIRECT_URL as string,
  },
  verbose: true,
  strict: true,
})
