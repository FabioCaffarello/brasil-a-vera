import { sql } from 'drizzle-orm'
import {
  boolean,
  char,
  index,
  jsonb,
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
    // Temas de interesse (Wave 10 Etapa 3). Array JSONB de strings com
    // os ids dos temas escolhidos no wizard (subset de TEMA_IDS).
    // Decisão registrada em LOGGED-AREA-VISION §5.6: lista é fixa (8) e
    // não há queries reversas críticas — coluna jsonb simples > 8 booleanas
    // > junction table. Default `[]` evita lidar com `null` no consumer.
    themes: jsonb('themes')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    // Opt-ins de comunicação (Wave 10 Etapa 5).
    // Separados dos `topic_*` da alert_policy (alertas de serviço sempre
    // ligados quando há follows; comunicação opt-in é mensagem fora do
    // serviço — releases, surveys). Default false: respeita LGPD art. 7º
    // I (consentimento expresso). consent_log audit trail em paralelo.
    marketingOptedIn: boolean('marketing_opted_in').notNull().default(false),
    surveyOptedIn: boolean('survey_opted_in').notNull().default(false),
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

// `alert_policy` — Wave 10 Etapa 3 (antecipada para persistir as
// escolhas do passo 3 do wizard; UI completa de gerenciamento entra
// na Etapa 6 sub-tab Políticas em /painel/alertas).
//
// 1:1 com user_profile via `user_id` como PK + FK. Colunas booleanas
// tipadas em vez de jsonb (ADR-029 §Schema/§4): topics e boosts são
// flags planas independentes, queriables, lidas pelo Drizzle sem
// coerção. Refator vem só quando entrarem ≥4 canais + matriz
// canal×topic (anti-pattern #2 do LOGGED-AREA-VISION §12).
//
// Cadence default `weekly` (LOGGED-AREA-VISION §6). channel_email +
// channel_inapp default `true` — Etapa 3 não expõe canais; serão
// configuráveis na sub-tab Políticas da Etapa 6.
export const alertPolicy = usuarioSchema.table('alert_policy', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => userProfile.id, { onDelete: 'cascade' }),
  cadence: text('cadence').notNull().default('weekly'),
  channelEmail: boolean('channel_email').notNull().default(true),
  channelInapp: boolean('channel_inapp').notNull().default(true),
  topicVotacoes: boolean('topic_votacoes').notNull().default(true),
  topicGastos: boolean('topic_gastos').notNull().default(false),
  topicProposicoes: boolean('topic_proposicoes').notNull().default(true),
  topicDiscursos: boolean('topic_discursos').notNull().default(false),
  topicDivergencias: boolean('topic_divergencias').notNull().default(true),
  boostEleicoes: boolean('boost_eleicoes').notNull().default(true),
  boostCpis: boolean('boost_cpis').notNull().default(true),
  boostProposicoesMarcadas: boolean('boost_proposicoes_marcadas')
    .notNull()
    .default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
})

export type AlertPolicy = typeof alertPolicy.$inferSelect
export type NewAlertPolicy = typeof alertPolicy.$inferInsert

// `consent_log` — Wave 10 Etapa 5 (antecipada para registrar consents
// de comunicação; UI dashboard /meus-dados e fluxos completos de
// exercício de direitos LGPD entram na Etapa 9).
//
// ADR-031 §C: `user_id` é nullable — após anonimização (LGPD art. 16),
// setamos NULL preservando o log como comprovação histórica de
// consentimento sem identificar o titular (art. 8º §6º).
//
// `ip_hash` (ADR-031 §D2): coluna existe agora como `text` mas vamos
// gravar string vazia até Etapa 9 implementar o salt diário completo.
// Trade-off temporário consciente — log do consent funcional para
// auditoria; reidentificação via IP fica para quando o framework
// completo entrar.
//
// Escopos esperados em produção (não enum DB para permitir extensão
// sem migration; validado no boundary Zod):
//   - 'marketing'         — opt-in comunicações esporádicas do projeto
//   - 'survey'            — opt-in convite para survey ocasional
//   - 'privacy_policy_v1' — aceite da política de privacidade vigente
//     (introduzido na Etapa 9)
export const consentLog = usuarioSchema.table(
  'consent_log',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id').references(() => userProfile.id, {
      onDelete: 'set null',
    }),
    scope: text('scope').notNull(),
    granted: boolean('granted').notNull(),
    legalBasis: text('legal_basis').notNull(),
    policyVersion: text('policy_version').notNull(),
    source: text('source').notNull(),
    ipHash: text('ip_hash').notNull().default(''),
    consentedAt: timestamp('consented_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    // Lookup "todos consents de um usuário" — Etapa 9 dashboard.
    index('consent_log_user_id_idx').on(table.userId),
    // Lookup "último consent de um escopo para um usuário" — checagem
    // pré-envio de marketing.
    index('consent_log_user_scope_idx').on(table.userId, table.scope),
  ],
)

export type ConsentLog = typeof consentLog.$inferSelect
export type NewConsentLog = typeof consentLog.$inferInsert

// `alert_delivery` — Wave 10 Etapa 7. Inbox de reports semanais
// (channel=inapp) e auditoria de envio por email (channel=email).
//
// Idempotency key (ADR-029 §Schema + ADR-030): sha256(user_id +
// period_start + cadence + channel). LOGGED-AREA-VISION §6 omitiu
// `channel` na composição — divergência consciente da Etapa 7 para
// suportar 1 row por canal (precisa de keys distintas).
//
// Status flow: pending → sent (envio OK) | failed (3 retries) |
// skipped (sem novidades no período — registra no log para auditoria
// mas não envia nada).
export const alertDelivery = usuarioSchema.table(
  'alert_delivery',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    userId: uuid('user_id')
      .notNull()
      .references(() => userProfile.id, { onDelete: 'cascade' }),
    idempotencyKey: text('idempotency_key').notNull(),
    channel: text('channel').notNull(),
    subject: text('subject').notNull(),
    bodyMd: text('body_md').notNull(),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    status: text('status').notNull(),
  },
  (table) => [
    uniqueIndex('alert_delivery_idempotency_key_unique').on(
      table.idempotencyKey,
    ),
    // Cobre inbox: "últimos N reports do usuário X".
    index('alert_delivery_user_scheduled_idx').on(
      table.userId,
      table.scheduledFor,
    ),
  ],
)

export type AlertDelivery = typeof alertDelivery.$inferSelect
export type NewAlertDelivery = typeof alertDelivery.$inferInsert
