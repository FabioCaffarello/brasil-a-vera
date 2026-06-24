import {
  boolean,
  date,
  index,
  integer,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'

import { parlamentar } from '@/modules/parlamentares/domain/schema'
import { trustLevel } from '@/shared/db/enums'

// Bounded context Vetos — schema isolado no Postgres.
// Tabelas: veto (aggregate root), dispositivo_veto, voto_veto.
// ADR-059: vetos presidenciais e votos do Congresso Nacional.
export const vetosSchema = pgSchema('vetos')

export const veto = vetosSchema.table(
  'veto',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    // Veto.Codigo da API do Senado
    sourceId: text('source_id').notNull(),
    // Veto.Materia.Codigo — usado para montar URL de resultado
    materiaCodigo: text('materia_codigo').notNull(),
    numero: text('numero').notNull(),
    ano: integer('ano').notNull(),
    ementa: text('ementa').notNull(),
    materiaVetadaSigla: text('materia_vetada_sigla'),
    materiaVetadaNumero: text('materia_vetada_numero'),
    materiaVetadaAno: integer('materia_vetada_ano'),
    materiaVetadaEmenta: text('materia_vetada_ementa'),
    // true = veto total; false = parcial
    vetoTotal: boolean('veto_total').notNull().default(false),
    assunto: text('assunto'),
    dataPublicacao: date('data_publicacao'),
    dataRecebimentoCongresso: date('data_recebimento_congresso'),
    emTramitacao: boolean('em_tramitacao').notNull().default(true),
    trustLevel: trustLevel('trust_level').notNull().default('L1'),
    sourceUrl: text('source_url').notNull(),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('veto_source_id_idx').on(t.sourceId),
    index('veto_ano_idx').on(t.ano),
  ],
)

export const dispositivoVeto = vetosSchema.table(
  'dispositivo_veto',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    vetoId: uuid('veto_id')
      .notNull()
      .references(() => veto.id, { onDelete: 'cascade' }),
    // Dispositivo.Codigo
    sourceId: text('source_id').notNull(),
    // Ex: "49.24.001"
    identificador: text('identificador').notNull(),
    descricao: text('descricao'),
    assunto: text('assunto'),
    // "Mantido" | "Rejeitado" | null (em tramitação)
    situacao: text('situacao'),
    // "Cédula" | "Painel"
    tipoVotacao: text('tipo_votacao'),
    dataSessao: date('data_sessao'),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('dispositivo_veto_source_id_idx').on(t.sourceId),
    index('dispositivo_veto_veto_id_idx').on(t.vetoId),
  ],
)

export const votoVeto = vetosSchema.table(
  'voto_veto',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    dispositivoId: uuid('dispositivo_id')
      .notNull()
      .references(() => dispositivoVeto.id, { onDelete: 'cascade' }),
    // Nullable: match por nome+UF pode falhar → preserva nome_raw para auditoria
    parlamentarId: uuid('parlamentar_id').references(() => parlamentar.id, {
      onDelete: 'set null',
    }),
    nomeRaw: text('nome_raw').notNull(),
    partidoRaw: text('partido_raw'),
    ufRaw: text('uf_raw'),
    // Normalizado: SIM | NAO | ABSTENCAO
    voto: text('voto').notNull(),
    // Apenas SENADO nesta versão (ADR-059)
    casa: text('casa').notNull().default('SENADO'),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('voto_veto_natural_key').on(t.dispositivoId, t.nomeRaw, t.casa),
    index('voto_veto_dispositivo_id_idx').on(t.dispositivoId),
    index('voto_veto_parlamentar_id_idx').on(t.parlamentarId),
  ],
)
