import { sql } from 'drizzle-orm'
import {
  char,
  index,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'

import { parlamentar } from '@/modules/parlamentares/domain/schema'

// Bounded context Usuário — schema isolado no Postgres (Wave 10 Etapa 1).
// Tabelas previstas (LOGGED-AREA-VISION §3): user_profile, follows,
// alert_policy, alert_delivery, consent_log, data_request, alert_period.
// Etapa 1 entrega apenas `user_profile`. Demais tabelas em etapas seguintes.
//
// Convenção LGPD (ADR-031): dados de usuário NÃO carregam `trust_level` /
// `source_url` / `ingested_at` (são para dados ingeridos de fontes externas).
// Em vez disso, colunas LGPD: `created_at`, `updated_at`, `deleted_at`,
// `onboarded_at`. `consent_log` separado virá em Etapa 9.
export const usuarioSchema = pgSchema('usuario')

export const userProfile = usuarioSchema.table(
  'user_profile',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    // FK opaca para Clerk. ADR-029 §2: preservamos UUIDv7 nosso como PK
    // interna para mitigar vendor lock-in; `clerk_user_id` é a única coluna
    // afetada se trocarmos Clerk no futuro.
    clerkUserId: text('clerk_user_id').notNull(),
    email: text('email').notNull(),
    displayName: text('display_name'),
    uf: char('uf', { length: 2 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    // Soft delete LGPD (ADR-031 §3): janela de 30 dias antes do hard delete.
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    // Wizard de onboarding (LOGGED-AREA-VISION §5.6): NULL = ainda não
    // completou o wizard. Setado em Etapa 3.
    onboardedAt: timestamp('onboarded_at', { withTimezone: true }),
  },
  (table) => [
    // Unique em clerk_user_id — chave natural usada pelo webhook do Clerk
    // para upsert idempotente (`ON CONFLICT (clerk_user_id) DO UPDATE`).
    uniqueIndex('user_profile_clerk_user_id_unique').on(table.clerkUserId),
    // Partial index em (deleted_at IS NULL) — listagens e auth lookups
    // sempre filtram soft-deleted. Reduz tamanho do índice em ~30 dias
    // de churn comparado a btree completo.
    index('user_profile_active_idx')
      .on(table.deletedAt)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
)

export type UserProfile = typeof userProfile.$inferSelect
export type NewUserProfile = typeof userProfile.$inferInsert

// `follows` — Wave 10 Etapa 2. Relação flat usuário ↔ parlamentar
// (ADR-029 §3). Sem flags, sem tri-state — um único toggle define a
// relação. PK composta é a chave natural; índice separado em
// `parlamentar_id` cobre agregação reversa (quantos seguem X).
//
// Cap operacional de 200 follows/usuário é enforçado a nível de API
// (lib/queries/follows.ts), NÃO via CHECK constraint — mantém o banco
// leve e permite ajuste de cap sem migration.
//
// ON DELETE CASCADE em ambos os FKs: se o usuário é hard-deleted
// (LGPD Etapa 9, 30d após soft delete), seus follows somem juntos;
// se um parlamentar é removido (caso raro: correção de duplicata),
// os follows também limpam.
export const follows = usuarioSchema.table(
  'follows',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => userProfile.id, { onDelete: 'cascade' }),
    parlamentarId: uuid('parlamentar_id')
      .notNull()
      .references(() => parlamentar.id, { onDelete: 'cascade' }),
    followedAt: timestamp('followed_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.parlamentarId] }),
    // Cobre agregação reversa: "quantos seguem o parlamentar X".
    // Sem isso, a query daria seq scan na tabela inteira.
    index('follows_parlamentar_id_idx').on(table.parlamentarId),
  ],
)

export type Follow = typeof follows.$inferSelect
export type NewFollow = typeof follows.$inferInsert
