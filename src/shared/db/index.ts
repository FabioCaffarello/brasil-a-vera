import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import * as schema from './schema'

// Singleton para evitar múltiplas conexões durante hot reload em desenvolvimento.
// O Next.js recria módulos a cada HMR — sem o singleton, cada reload abre uma conexão nova
// até estourar o limite do banco.
const globalForDb = globalThis as unknown as {
  connection: postgres.Sql | undefined
}

const connection =
  globalForDb.connection ?? postgres(process.env.DATABASE_URL as string)

if (process.env.NODE_ENV !== 'production') {
  globalForDb.connection = connection
}

export const db = drizzle(connection, { schema })
