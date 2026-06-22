import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  integer,
  pgSchema,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'

import { parlamentar } from '@/modules/parlamentares/domain/schema'
import {
  casa,
  situacaoProposicao,
  tipoAutoria,
  tipoProposicao,
  trustLevel,
} from '@/shared/db/enums'

// Bounded context Proposicoes — schema isolado no Postgres.
// Tabelas: proposicao (aggregate root), proposicao_tema, proposicao_autor,
// tramitacao. Especificação em docs/domain/DATA-DICTIONARY.md#proposições.
export const proposicoesSchema = pgSchema('proposicoes')

export const proposicao = proposicoesSchema.table(
  'proposicao',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    sourceId: text('source_id').notNull(),
    // Source ids por casa: preservam o rastro independente que cada
    // ingestor (Câmara/Senado) registra. `source_id`/`source_url` ainda
    // refletem o "último ingestor" — útil em diagnóstico, mas insuficiente
    // para tramitação de proposições compartilhadas (PL Câmara → Senado).
    // Issue #74 detalha o motivo.
    sourceIdCamara: text('source_id_camara'),
    sourceIdSenado: text('source_id_senado'),
    tipo: tipoProposicao('tipo').notNull(),
    numero: integer('numero').notNull(),
    ano: integer('ano').notNull(),
    ementa: text('ementa').notNull(),
    ementaDetalhada: text('ementa_detalhada'),
    situacao: situacaoProposicao('situacao').notNull(),
    regime: text('regime'),
    trustLevel: trustLevel('trust_level').notNull(),
    sourceUrl: text('source_url').notNull(),
    sourceUrlCamara: text('source_url_camara'),
    sourceUrlSenado: text('source_url_senado'),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    // Chave natural: PL 1234/2025 é único.
    uniqueIndex('proposicao_tipo_numero_ano_unique').on(
      table.tipo,
      table.numero,
      table.ano,
    ),
    // B-tree em numero — Wave 8 Sprint 8.1 PR2. Permite "busca por número
    // exato sem tipo" (input "1234" → match em qualquer tipo de PL/PEC/etc).
    // O unique index acima usa `tipo` como leading column, então NÃO ajuda
    // queries sem condição em tipo. Sem pg_trgm (decisão cravada na rodada
    // 2): busca por ementa fica como ILIKE %X% via sequential scan
    // (aceitável até ~50k rows; reabrir se cardinalidade subir).
    index('proposicao_numero_idx').on(table.numero),
  ],
)

export const proposicaoTema = proposicoesSchema.table(
  'proposicao_tema',
  {
    proposicaoId: uuid('proposicao_id')
      .notNull()
      .references(() => proposicao.id, { onDelete: 'cascade' }),
    codigoTema: integer('codigo_tema').notNull(),
    nomeTema: text('nome_tema').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.proposicaoId, table.codigoTema],
      name: 'proposicao_tema_pk',
    }),
  ],
)

export const proposicaoAutor = proposicoesSchema.table(
  'proposicao_autor',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    proposicaoId: uuid('proposicao_id')
      .notNull()
      .references(() => proposicao.id, { onDelete: 'cascade' }),
    // Autor pode não ser parlamentar (ex.: Comissão, Mesa, Senado Federal).
    // ON DELETE SET NULL para preservar o registro do autor caso o parlamentar
    // seja removido por algum motivo.
    parlamentarId: uuid('parlamentar_id').references(() => parlamentar.id, {
      onDelete: 'set null',
    }),
    nome: text('nome').notNull(),
    tipoAutoria: tipoAutoria('tipo_autoria').notNull(),
  },
  (table) => [
    // Uniqueness em dois caminhos mutuamente exclusivos (partial indexes):
    // - quando parlamentar_id está preenchido, ele é a chave natural.
    // - quando autor é externo (parlamentar_id NULL), o nome é a chave.
    uniqueIndex('proposicao_autor_proposicao_parlamentar_unique')
      .on(table.proposicaoId, table.parlamentarId)
      .where(sql`${table.parlamentarId} IS NOT NULL`),
    uniqueIndex('proposicao_autor_proposicao_nome_unique')
      .on(table.proposicaoId, table.nome)
      .where(sql`${table.parlamentarId} IS NULL`),
    // FKs explícitos para joins em listagens.
    index('proposicao_autor_proposicao_id_idx').on(table.proposicaoId),
    index('proposicao_autor_parlamentar_id_idx').on(table.parlamentarId),
  ],
)

// Relatoria (ADR-044): relator vigente/último da proposição. Tabela-filha da
// proposicao — herda trust da raiz (princípio 3), não carrega trust_level
// próprio. Bicameral (emenda 2026-06-21): uma matéria pode ter um relator por
// casa, então `casa` entra na chave natural.
export const relatoria = proposicoesSchema.table(
  'relatoria',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    proposicaoId: uuid('proposicao_id')
      .notNull()
      .references(() => proposicao.id, { onDelete: 'cascade' }),
    // Câmara ('uriUltimoRelator') ou Senado ('/senador/{id}/relatorias'). Default
    // 'CAMARA' faz backfill das linhas pré-existentes (#526); a ingestão grava a
    // casa explícita.
    casa: casa('casa').notNull().default('CAMARA'),
    // Relator pode não estar na nossa base (ex.: ex-parlamentar fora da
    // legislatura atual). SET NULL preserva o registro; o confronto filtra
    // parlamentar_id não-nulo (fail-closed, ADR-044 D3).
    parlamentarId: uuid('parlamentar_id').references(() => parlamentar.id, {
      onDelete: 'set null',
    }),
    // id do relator na fonte: deputado (Câmara) ou senador (Senado).
    relatorSourceId: text('relator_source_id').notNull(),
    // Data de designação do relator (Senado: DataDesignacao). Null na Câmara
    // (uriUltimoRelator não traz data). Desempata o "último relator" de forma
    // determinística quando uma matéria teve vários relatores no tempo: vence a
    // designação mais recente, independente da ordem de ingestão (ADR-044).
    designadoEm: date('designado_em'),
    ingestedAt: timestamp('ingested_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    // Um relator por proposição POR CASA (emenda 2026-06-21) — chave p/ upsert.
    uniqueIndex('relatoria_proposicao_casa_unique').on(
      table.proposicaoId,
      table.casa,
    ),
    index('relatoria_parlamentar_id_idx').on(table.parlamentarId),
  ],
)

export const tramitacao = proposicoesSchema.table(
  'tramitacao',
  {
    id: uuid('id')
      .primaryKey()
      .$defaultFn(() => uuidv7()),
    proposicaoId: uuid('proposicao_id')
      .notNull()
      .references(() => proposicao.id, { onDelete: 'cascade' }),
    data: timestamp('data', { withTimezone: true }).notNull(),
    orgao: text('orgao').notNull(),
    // Primeira frase/parágrafo, truncado para ≤200 chars no mapper.
    descricaoResumida: text('descricao_resumida').notNull(),
    // Apenas quando agrega valor sobre `descricao_resumida` (despacho longo
    // da Câmara ou descrição detalhada do Senado). NULL quando a fonte tem
    // só uma descrição curta.
    descricaoCompleta: text('descricao_completa'),
    // Situação após o evento (`descricaoSituacao` Câmara / situação Senado).
    situacaoResultante: text('situacao_resultante'),
    // Chave natural por evento na fonte:
    //   - Câmara: `sequencia` (int estável por proposição)
    //   - Senado: `informeLegislativo.id` (int globalmente único)
    // Combinado com proposicao_id, dá unicidade suficiente.
    sourceId: text('source_id').notNull(),
  },
  (table) => [
    // Chave natural: garante idempotência via INSERT ... ON CONFLICT
    // DO UPDATE (princípio 5 do CLAUDE.md).
    uniqueIndex('tramitacao_proposicao_source_unique').on(
      table.proposicaoId,
      table.sourceId,
    ),
    // Index em FK para queries "timeline da proposição X ORDER BY data".
    index('tramitacao_proposicao_id_idx').on(table.proposicaoId),
  ],
)

// Tabela agregada — Wave 8 Sprint 8.0 PR1. Espelho do padrão da Wave 7
// (estatistica_parlamentar_agregada), aplicado ao eixo "artefato jurídico".
// Reduz comparações de KPI (idade vs. mediana do tipo, n autores · partidos ·
// UFs, votações aprovadas/rejeitadas) a uma única linha por proposição,
// evitando materialized view (ADR-019: complexidade só com gargalo provado).
// Populada por seed:agregados:proposicao (Sprint 8.0 PR2), idempotente via
// INSERT … ON CONFLICT … DO UPDATE. Consumida por KpiStrip v2 do detalhe
// (Sprint 8.2 PR1) e por ProposicaoCard v2 da listagem (Sprint 8.1 PR4).
export const estatisticaProposicaoAgregada = proposicoesSchema.table(
  'estatistica_proposicao_agregada',
  {
    proposicaoId: uuid('proposicao_id')
      .primaryKey()
      .references(() => proposicao.id, { onDelete: 'cascade' }),
    // Dias entre a 1ª tramitação (apresentação) e hoje. Zero quando não há
    // tramitação registrada (proposição recém-ingerida).
    diasEmTramitacao: integer('dias_em_tramitacao').notNull().default(0),
    // Dias desde a tramitação mais recente. NULL quando n_eventos_tramitacao
    // = 0 (sem como medir).
    diasDesdeUltimaTramitacao: integer('dias_desde_ultima_tramitacao'),
    // Contagem de autores na proposicao_autor (qualquer tipoAutoria).
    nAutores: integer('n_autores').notNull().default(0),
    // Cardinalidade de partidos distintos entre autores que são parlamentares
    // (autoria por órgão/comissão não conta). Zero quando autoria é apenas
    // externa (Mesa, Comissão, Senado Federal, etc.).
    nPartidosAutores: integer('n_partidos_autores').notNull().default(0),
    // Cardinalidade de UFs distintas entre autores parlamentares. Mesmo
    // critério de nPartidosAutores.
    nUfsAutores: integer('n_ufs_autores').notNull().default(0),
    // Votações vinculadas (qualquer resultado).
    nVotacoes: integer('n_votacoes').notNull().default(0),
    nVotacoesAprovadas: integer('n_votacoes_aprovadas').notNull().default(0),
    nVotacoesRejeitadas: integer('n_votacoes_rejeitadas').notNull().default(0),
    // Total de eventos em tramitacao (cardinalidade do array).
    nEventosTramitacao: integer('n_eventos_tramitacao').notNull().default(0),
    // Órgão da última tramitação (ex: "CCJC", "Plenário", "Mesa do Senado").
    // NULL quando n_eventos_tramitacao = 0.
    ultimoOrgao: text('ultimo_orgao'),
    // True se houve aprovação em pelo menos uma votação vinculada (Câmara OU
    // Senado). Usado pelo KpiStrip para narrar "aprovada em alguma casa".
    aprovadaEmAlgumaCasa: boolean('aprovada_em_alguma_casa')
      .notNull()
      .default(false),
    // Mediana de diasEmTramitacao do mesmo tipoProposicao no banco. NULL
    // quando a amostra do tipo é < 50 — honestidade do dado (P2 Wave 8):
    // não comparar "vs mediana de 3 MPVs" seria desonesto. Decoder da UI
    // checa NULL → suprime hint comparativo.
    medianaDiasTipoReferencia: integer('mediana_dias_tipo_referencia'),
    // Código do tema "canônico" da proposição — o tema com maior cardinalidade
    // global entre os temas catalogados desta proposição (decisão resolvida
    // #4 da rodada 2). Pré-computado aqui para evitar custo recorrente no
    // footer cross-links (Sprint 8.2 PR5). NULL quando proposição não tem
    // tema catalogado.
    temaCanonicoCodigo: integer('tema_canonico_codigo'),
    trustLevel: trustLevel('trust_level').notNull().default('L2'),
    computedAt: timestamp('computed_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    // Ordenação descendente para "ranking de proposições mais antigas em
    // tramitação". NULLS LAST não se aplica (coluna NOT NULL).
    index('idx_estat_proposicao_dias').on(sql`${table.diasEmTramitacao} DESC`),
    // Ordenação ascendente para "proposições mais recentemente movimentadas
    // primeiro". NULLS LAST mantém proposições sem tramitação fora do topo.
    index('idx_estat_proposicao_movimentacao').on(
      sql`${table.diasDesdeUltimaTramitacao} ASC NULLS LAST`,
    ),
    // Index parcial em tema_canonico_codigo — footer cross-links sempre
    // filtra "WHERE tema_canonico_codigo = ?" e ignora proposições sem
    // tema canônico. Partial index economiza espaço quando muitas linhas
    // têm NULL.
    index('idx_estat_proposicao_tema_canonico')
      .on(table.temaCanonicoCodigo)
      .where(sql`${table.temaCanonicoCodigo} IS NOT NULL`),
  ],
)
