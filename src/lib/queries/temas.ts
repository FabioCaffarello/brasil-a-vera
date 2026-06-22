import { and, desc, eq, isNotNull, sql } from 'drizzle-orm'

import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import {
  parlamentar,
  proposicao,
  proposicaoAutor,
  proposicaoTema,
} from '@/shared/db/schema'

// Busca por tema (ADR-050): taxonomia oficial `proposicao_tema` (curada, sem
// keywords ruidosas). Tema → proposições + parlamentares que mais autoram.
// Determinístico, sem IA. Cache de edge 6h (cadência de proposições).

export interface TemaResumo {
  codigo: number
  nome: string
  proposicoes: number
}

export interface TemaParlamentar {
  id: string
  nome: string
  casa: string
  partidoSigla: string
  uf: string
  urlFoto: string | null
  proposicoes: number
}

export interface TemaProposicao {
  proposicaoId: string
  tipo: string
  numero: number
  ano: number
  ementa: string
}

export interface TemaDetalhe {
  codigo: number
  nome: string
  total: number
  parlamentares: TemaParlamentar[]
  proposicoes: TemaProposicao[]
}

const TOP_PARLAMENTARES = 12
const RECENTES = 10

export async function getTemas(): Promise<TemaResumo[]> {
  return cached('temas:lista', TTL.proposicoesStatsGlobais, async () => {
    const rows = await db
      .select({
        codigo: proposicaoTema.codigoTema,
        nome: sql<string>`MAX(${proposicaoTema.nomeTema})`,
        proposicoes: sql<number>`COUNT(DISTINCT ${proposicaoTema.proposicaoId})::int`,
      })
      .from(proposicaoTema)
      .groupBy(proposicaoTema.codigoTema)
      .orderBy(desc(sql`COUNT(DISTINCT ${proposicaoTema.proposicaoId})`))
    return rows.map((r) => ({ ...r, proposicoes: Number(r.proposicoes) }))
  })
}

export async function getTema(codigo: number): Promise<TemaDetalhe | null> {
  return cached(
    `temas:detalhe:${codigo}`,
    TTL.proposicoesStatsGlobais,
    async () => {
      const parlamentares = await db
        .select({
          id: parlamentar.id,
          nome: parlamentar.nome,
          casa: parlamentar.casa,
          partidoSigla: parlamentar.partidoSigla,
          uf: parlamentar.uf,
          urlFoto: parlamentar.urlFoto,
          proposicoes: sql<number>`COUNT(DISTINCT ${proposicaoTema.proposicaoId})::int`,
          nome_tema: sql<string>`MAX(${proposicaoTema.nomeTema})`,
        })
        .from(proposicaoTema)
        .innerJoin(
          proposicaoAutor,
          and(
            eq(proposicaoAutor.proposicaoId, proposicaoTema.proposicaoId),
            isNotNull(proposicaoAutor.parlamentarId),
          ),
        )
        .innerJoin(
          parlamentar,
          eq(parlamentar.id, proposicaoAutor.parlamentarId),
        )
        .where(eq(proposicaoTema.codigoTema, codigo))
        .groupBy(
          parlamentar.id,
          parlamentar.nome,
          parlamentar.casa,
          parlamentar.partidoSigla,
          parlamentar.uf,
          parlamentar.urlFoto,
        )
        .orderBy(desc(sql`COUNT(DISTINCT ${proposicaoTema.proposicaoId})`))
        .limit(TOP_PARLAMENTARES)

      const proposicoes = await db
        .selectDistinct({
          proposicaoId: proposicao.id,
          tipo: proposicao.tipo,
          numero: proposicao.numero,
          ano: proposicao.ano,
          ementa: proposicao.ementa,
        })
        .from(proposicaoTema)
        .innerJoin(proposicao, eq(proposicao.id, proposicaoTema.proposicaoId))
        .where(eq(proposicaoTema.codigoTema, codigo))
        .orderBy(desc(proposicao.ano), desc(proposicao.numero))
        .limit(RECENTES)

      const totalRow = await db
        .select({
          nome: sql<string>`MAX(${proposicaoTema.nomeTema})`,
          total: sql<number>`COUNT(DISTINCT ${proposicaoTema.proposicaoId})::int`,
        })
        .from(proposicaoTema)
        .where(eq(proposicaoTema.codigoTema, codigo))
      const meta = totalRow[0]
      if (!meta || Number(meta.total) === 0) return null

      return {
        codigo,
        nome: meta.nome,
        total: Number(meta.total),
        parlamentares: parlamentares.map((p) => ({
          id: p.id,
          nome: p.nome,
          casa: p.casa,
          partidoSigla: p.partidoSigla,
          uf: p.uf,
          urlFoto: p.urlFoto,
          proposicoes: Number(p.proposicoes),
        })),
        proposicoes,
      }
    },
  )
}
