import { desc, eq, inArray, sql } from 'drizzle-orm'
import { cached, TTL } from '@/lib/cache'
import {
  classifyDirecao,
  type DirecaoProposicao,
  eContraditorio,
} from '@/lib/coerencia/direcao-classifier'
import { db } from '@/shared/db'
import {
  proposicao,
  proposicaoTema,
  votacao,
  votoNominal,
} from '@/shared/db/schema'

export interface ParContraditorio {
  /** Tema em comum (apenas o "principal" — o primeiro entre os interceptos). */
  tema: string
  voto1: VotoParaCoerencia
  voto2: VotoParaCoerencia
  /** Dias entre os dois votos (contexto temporal obrigatório). */
  diasEntreVotos: number
}

interface VotoParaCoerencia {
  votacaoId: string
  votacaoDescricao: string
  dataHora: Date | string
  proposicaoTipo: string
  proposicaoNumero: number
  proposicaoAno: number
  ementa: string
  direcao: DirecaoProposicao
  voto: string
}

interface VotoComProposicao extends VotoParaCoerencia {
  proposicaoId: string
  temas: string[]
}

const VOTOS_RELEVANTES = ['SIM', 'NAO'] as const

// Carrega todos os votos do parlamentar em votações ligadas a proposições
// (FK `votacao.proposicao_id` preenchida — feito pelo backfill da Wave 0)
// e enriquece com ementa + temas. Pré-condição para o pipeline de coerência.
async function loadVotosComProposicao(
  parlamentarId: string,
): Promise<VotoComProposicao[]> {
  const rows = await db
    .select({
      votacaoId: votacao.id,
      votacaoDescricao: votacao.descricao,
      dataHora: votacao.dataHora,
      proposicaoId: proposicao.id,
      proposicaoTipo: proposicao.tipo,
      proposicaoNumero: proposicao.numero,
      proposicaoAno: proposicao.ano,
      ementa: proposicao.ementa,
      voto: votoNominal.voto,
    })
    .from(votoNominal)
    .innerJoin(votacao, eq(votacao.id, votoNominal.votacaoId))
    .innerJoin(proposicao, eq(proposicao.id, votacao.proposicaoId))
    .where(
      sql`${votoNominal.parlamentarId} = ${parlamentarId} AND ${votoNominal.voto} IN ('SIM', 'NAO')`,
    )
    .orderBy(desc(votacao.dataHora))

  if (rows.length === 0) return []

  // Carrega temas das proposições envolvidas (1 query, agrupado em memória)
  const proposicaoIds = Array.from(new Set(rows.map((r) => r.proposicaoId)))
  const temasRows = await db
    .select({
      proposicaoId: proposicaoTema.proposicaoId,
      nomeTema: proposicaoTema.nomeTema,
    })
    .from(proposicaoTema)
    .where(inArray(proposicaoTema.proposicaoId, proposicaoIds))

  const temasPorProposicao = new Map<string, string[]>()
  for (const t of temasRows) {
    const arr = temasPorProposicao.get(t.proposicaoId) ?? []
    arr.push(t.nomeTema)
    temasPorProposicao.set(t.proposicaoId, arr)
  }

  return rows.map((r) => ({
    votacaoId: r.votacaoId,
    votacaoDescricao: r.votacaoDescricao,
    dataHora: r.dataHora,
    proposicaoTipo: r.proposicaoTipo,
    proposicaoNumero: r.proposicaoNumero,
    proposicaoAno: r.proposicaoAno,
    ementa: r.ementa,
    direcao: classifyDirecao(r.ementa),
    voto: r.voto,
    proposicaoId: r.proposicaoId,
    temas: temasPorProposicao.get(r.proposicaoId) ?? [],
  }))
}

// Função pura: dado um conjunto de votos já carregados, computa os pares
// contraditórios. Extraído para evitar recarregar votos em getCoerenciaStats.
function computePares(
  votos: VotoComProposicao[],
  limit = 10,
): ParContraditorio[] {
  if (votos.length < 2) return []

  // Filtra apenas votos com direção decidida — pares sempre exigem ambos
  // os lados classificados.
  const classificados = votos.filter(
    (v) =>
      v.direcao !== 'NAO_CLASSIFICADA' &&
      VOTOS_RELEVANTES.includes(v.voto as (typeof VOTOS_RELEVANTES)[number]),
  )

  const pares: ParContraditorio[] = []
  for (let i = 0; i < classificados.length; i++) {
    for (let j = i + 1; j < classificados.length; j++) {
      const v1 = classificados[i]
      const v2 = classificados[j]
      if (!eContraditorio(v1, v2)) continue
      const temasComuns = v1.temas.filter((t) => v2.temas.includes(t))
      if (temasComuns.length === 0) continue
      const data1 = new Date(v1.dataHora).getTime()
      const data2 = new Date(v2.dataHora).getTime()
      const diasEntreVotos = Math.abs(
        Math.round((data2 - data1) / (1000 * 60 * 60 * 24)),
      )
      pares.push({
        tema: temasComuns[0],
        voto1: v1,
        voto2: v2,
        diasEntreVotos,
      })
    }
  }

  // Ordena por par mais recente (max(data1, data2)) — mais relevante primeiro.
  pares.sort((a, b) => {
    const aMax = Math.max(
      new Date(a.voto1.dataHora).getTime(),
      new Date(a.voto2.dataHora).getTime(),
    )
    const bMax = Math.max(
      new Date(b.voto1.dataHora).getTime(),
      new Date(b.voto2.dataHora).getTime(),
    )
    return bMax - aMax
  })

  return pares.slice(0, limit)
}

/**
 * Encontra pares contraditórios do parlamentar — mesmo tema, direções
 * opostas, voto idêntico. Implementação O(N²) sobre os votos válidos do
 * parlamentar. Para a Wave 1 com poucas votações classificadas isso é
 * trivialmente rápido; refinar se virar problema.
 */
export async function getParesContraditorios(
  parlamentarId: string,
  limit = 10,
): Promise<ParContraditorio[]> {
  const votos = await loadVotosComProposicao(parlamentarId)
  return computePares(votos, limit)
}

/**
 * Versão cacheada de {@link getParesContraditorios} (ADR-054 / disciplina de
 * custo Neon, princípio 8/12). A query crua bate 2 vezes no banco; a rota
 * /contradicao (page + OG) é martelada por scrapers, então edge-cache é
 * obrigatório. Consumida também pelo perfil. TTL de 6h (`TTL.coerenciaPares`):
 * pares só mudam com nova ingestão de votação (cron diário).
 *
 * Atenção: `cached()` faz JSON roundtrip → `dataHora` (Date | string) chega ao
 * consumidor como string ISO. Os consumidores (`formatDataBR`, VotoCard) já
 * aceitam `Date | string`; `diasEntreVotos` é pré-computado.
 */
export function getParesContraditoriosCached(
  parlamentarId: string,
  limit = 10,
): Promise<ParContraditorio[]> {
  return cached(
    `coerencia:pares:${parlamentarId}:${limit}`,
    TTL.coerenciaPares,
    () => getParesContraditorios(parlamentarId, limit),
  )
}

/**
 * Localiza um par específico pelos dois `votacaoId`. Tolerante à ORDEM: casa
 * tanto (voto1, voto2) quanto (voto2, voto1) — a ordem canônica do par depende
 * do `ORDER BY dataHora` da query e pode mudar entre janelas de cache; um link
 * compartilhado (ordem canônica) e um eventual link com a ordem trocada devem
 * resolver para o mesmo fato. Pura — usada pela rota /contradicao (ADR-054).
 */
export function findPar(
  pares: ParContraditorio[],
  votoAId: string,
  votoBId: string,
): ParContraditorio | undefined {
  return pares.find(
    (p) =>
      (p.voto1.votacaoId === votoAId && p.voto2.votacaoId === votoBId) ||
      (p.voto1.votacaoId === votoBId && p.voto2.votacaoId === votoAId),
  )
}

export interface CoerenciaStats {
  votosClassificados: number
  votosTotaisComProposicao: number
  paresContraditoriosDetectados: number
}

/** Estatísticas resumidas — útil para empty states informativos. */
export async function getCoerenciaStats(
  parlamentarId: string,
): Promise<CoerenciaStats> {
  const votos = await loadVotosComProposicao(parlamentarId)
  const classificados = votos.filter(
    (v) =>
      v.direcao !== 'NAO_CLASSIFICADA' &&
      VOTOS_RELEVANTES.includes(v.voto as (typeof VOTOS_RELEVANTES)[number]),
  )
  return {
    votosClassificados: classificados.length,
    votosTotaisComProposicao: votos.length,
    paresContraditoriosDetectados: computePares(votos, Number.MAX_SAFE_INTEGER)
      .length,
  }
}

/** Versão cacheada de {@link getCoerenciaStats} (ADR-054, mesma disciplina de
 *  custo que {@link getParesContraditoriosCached}). */
export function getCoerenciaStatsCached(
  parlamentarId: string,
): Promise<CoerenciaStats> {
  return cached(`coerencia:stats:${parlamentarId}`, TTL.coerenciaPares, () =>
    getCoerenciaStats(parlamentarId),
  )
}
