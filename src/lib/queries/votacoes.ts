import { and, asc, count, desc, eq, sql } from 'drizzle-orm'

import { db } from '@/shared/db'
import {
  parlamentar,
  proposicao,
  votacao,
  votoNominal,
} from '@/shared/db/schema'

export type Casa = 'CAMARA' | 'SENADO'

export type TipoVoto = 'SIM' | 'NAO' | 'ABSTENCAO' | 'AUSENTE' | 'OBSTRUCAO'

export const TIPOS_VOTO: readonly TipoVoto[] = [
  'SIM',
  'NAO',
  'ABSTENCAO',
  'AUSENTE',
  'OBSTRUCAO',
] as const

export interface FiltrosVotacao {
  casa?: Casa
  ano?: number
  /** "todas" | "aprovadas" | "rejeitadas" */
  resultado?: 'aprovadas' | 'rejeitadas'
  /** Apenas votações com pelo menos 1 voto nominal registrado. */
  somenteNominais?: boolean
}

export async function listVotacoes(filtros: FiltrosVotacao = {}, limit = 50) {
  const where = []
  if (filtros.casa) where.push(eq(votacao.casa, filtros.casa))
  if (filtros.ano) {
    where.push(sql`extract(year from ${votacao.dataHora}) = ${filtros.ano}`)
  }
  if (filtros.resultado === 'aprovadas') where.push(eq(votacao.aprovada, true))
  if (filtros.resultado === 'rejeitadas')
    where.push(eq(votacao.aprovada, false))
  if (filtros.somenteNominais) {
    where.push(
      sql`exists (select 1 from votacoes.voto_nominal vn where vn.votacao_id = ${votacao.id})`,
    )
  }

  return db
    .select({
      id: votacao.id,
      sourceId: votacao.sourceId,
      casa: votacao.casa,
      dataHora: votacao.dataHora,
      descricao: votacao.descricao,
      orgao: votacao.orgao,
      aprovada: votacao.aprovada,
      votosSim: votacao.votosSim,
      votosNao: votacao.votosNao,
      abstencoes: votacao.abstencoes,
    })
    .from(votacao)
    .where(where.length > 0 ? and(...where) : undefined)
    .orderBy(desc(votacao.dataHora))
    .limit(limit)
}

export async function getVotacaoById(id: string) {
  const rows = await db
    .select()
    .from(votacao)
    .where(eq(votacao.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function getProposicaoVinculada(proposicaoId: string | null) {
  if (!proposicaoId) return null
  const rows = await db
    .select({
      id: proposicao.id,
      tipo: proposicao.tipo,
      numero: proposicao.numero,
      ano: proposicao.ano,
      ementa: proposicao.ementa,
      situacao: proposicao.situacao,
    })
    .from(proposicao)
    .where(eq(proposicao.id, proposicaoId))
    .limit(1)
  return rows[0] ?? null
}

export interface VotoIndividual {
  id: string
  voto: string
  parlamentarId: string
  parlamentarNome: string
  parlamentarPartidoSigla: string
  parlamentarUf: string
}

export async function getVotosByVotacao(
  votacaoId: string,
  filtros: { voto?: TipoVoto } = {},
): Promise<VotoIndividual[]> {
  const where = [eq(votoNominal.votacaoId, votacaoId)]
  if (filtros.voto) where.push(eq(votoNominal.voto, filtros.voto))

  return db
    .select({
      id: votoNominal.id,
      voto: votoNominal.voto,
      parlamentarId: parlamentar.id,
      parlamentarNome: parlamentar.nome,
      parlamentarPartidoSigla: parlamentar.partidoSigla,
      parlamentarUf: parlamentar.uf,
    })
    .from(votoNominal)
    .innerJoin(parlamentar, eq(parlamentar.id, votoNominal.parlamentarId))
    .where(and(...where))
    .orderBy(asc(parlamentar.partidoSigla), asc(parlamentar.nome))
}

export interface ResumoPorPartido {
  partidoSigla: string
  sim: number
  nao: number
  abstencao: number
  ausente: number
  obstrucao: number
  total: number
}

// Agregação por partido — útil quando o usuário quer ver como cada partido
// se posicionou sem ler 500 nomes individualmente.
export async function getVotosResumoPorPartido(
  votacaoId: string,
): Promise<ResumoPorPartido[]> {
  const rows = await db
    .select({
      partidoSigla: parlamentar.partidoSigla,
      voto: votoNominal.voto,
      n: count(votoNominal.id),
    })
    .from(votoNominal)
    .innerJoin(parlamentar, eq(parlamentar.id, votoNominal.parlamentarId))
    .where(eq(votoNominal.votacaoId, votacaoId))
    .groupBy(parlamentar.partidoSigla, votoNominal.voto)

  const mapa = new Map<string, ResumoPorPartido>()
  for (const r of rows) {
    const existing = mapa.get(r.partidoSigla) ?? {
      partidoSigla: r.partidoSigla,
      sim: 0,
      nao: 0,
      abstencao: 0,
      ausente: 0,
      obstrucao: 0,
      total: 0,
    }
    if (r.voto === 'SIM') existing.sim = r.n
    else if (r.voto === 'NAO') existing.nao = r.n
    else if (r.voto === 'ABSTENCAO') existing.abstencao = r.n
    else if (r.voto === 'AUSENTE') existing.ausente = r.n
    else if (r.voto === 'OBSTRUCAO') existing.obstrucao = r.n
    existing.total += r.n
    mapa.set(r.partidoSigla, existing)
  }
  return Array.from(mapa.values()).sort((a, b) => b.total - a.total)
}

export async function getAnosVotacaoDistintos(): Promise<number[]> {
  const rows = await db.execute(sql`
    SELECT DISTINCT extract(year from ${votacao.dataHora})::int AS ano
    FROM ${votacao}
    ORDER BY ano DESC
  `)
  return rows.rows.map((r) => Number(r.ano))
}
