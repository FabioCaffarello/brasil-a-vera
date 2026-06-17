// Schema central de env vars da app Next 16. Autoridade documental e
// validadora.
//
// Contrato dual:
//
// (a) Sites EAGER (carregam no boot do server) importam `env` daqui
//     e ganham tipo estrito + fail-fast em produção quando a var
//     obrigatória falta. Sites atuais: src/shared/db/index.ts,
//     src/lib/site-url.ts, src/app/layout.tsx, route handlers de cron.
//
// (b) Sites LAZY (admin-auth.ts, ip-hash.ts, resend-client.ts) leem
//     `process.env.X` direto, de forma per-request, com degradação
//     graciosa quando ausente (retornam null/false em vez de crashar
//     o Worker no boot). Esses módulos estão listados no schema abaixo
//     para documentação e validação eager EM PRODUÇÃO via cadeia de
//     import (qualquer página que toque o banco importa `env`), mas
//     a leitura runtime continua via `process.env` por design.
//
// Por que a maioria das server vars está `.optional()`:
//   CI buildtime tem só DATABASE_URL (placeholder) + NEXT_PUBLIC_CLERK_*.
//   As demais vivem como Workers Secrets, materializadas em runtime via
//   polyfill do OpenNext. Marcar `.optional()` no schema casa com esse
//   contrato sem precisar mexer no deploy.yml — e o consumer code (libs
//   lazy) já trata `undefined` graciosamente.
//
// Para FORÇAR uma var como obrigatória em runtime depois (após
// bootstrap estabilizado em prod), remover `.optional()` do schema —
// não há mudança necessária no consumer code.
//
// Prevenção de leak no client:
//   importar `env` de um arquivo `"use client"` e acessar uma chave
//   server-only lança erro em runtime ("Attempted to access a server-side
//   environment variable on the client"). Esta é a barreira estrutural —
//   complementar à inlining de NEXT_PUBLIC_* que o Next já faz.

import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    // Seleção de driver de banco por ambiente (ADR-015). Ausente/'neon-http'
    // = produção (Cloudflare Workers / Neon). 'node-postgres' = dev local
    // contra o Postgres em Docker (docker-compose.yml), sem consumir a cota
    // do Neon. Lido também em ingestion/shared/db.ts via process.env.
    DB_DRIVER: z.enum(['neon-http', 'node-postgres']).optional(),
    SITE_URL: z.string().url().optional(),
    ADMIN_API_KEY: z
      .string()
      .min(32, 'ADMIN_API_KEY deve ter pelo menos 32 caracteres')
      .optional(),
    IP_HASH_SALT: z.string().min(1).optional(),
    CRON_SECRET: z.string().min(1).optional(),
    RESEND_API_KEY: z.string().min(1).optional(),
    RESEND_FROM: z.string().min(1).optional(),
    CLERK_SECRET_KEY: z.string().min(1).optional(),
  },
  client: {
    // Optional no schema porque o CI workflow `ci.yml` não fornece a
    // key (só `deploy.yml` injeta). Clerk SDK lê via process.env
    // diretamente (Next inlina NEXT_PUBLIC_* no buildtime), então o
    // contrato runtime de Clerk não depende deste schema. Listar aqui
    // serve documentação + tipagem para qualquer app code que venha
    // a consumir a key direto.
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
  },
  shared: {
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    DB_DRIVER: process.env.DB_DRIVER,
    SITE_URL: process.env.SITE_URL,
    ADMIN_API_KEY: process.env.ADMIN_API_KEY,
    IP_HASH_SALT: process.env.IP_HASH_SALT,
    CRON_SECRET: process.env.CRON_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM: process.env.RESEND_FROM,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NODE_ENV: process.env.NODE_ENV,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})
