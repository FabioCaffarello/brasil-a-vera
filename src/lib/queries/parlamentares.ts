import { and, count, desc, eq, sql, sum } from 'drizzle-orm'

import { db } from '@/shared/db'
import {
  gasto,
  parlamentar,
  proposicao,
  proposicaoAutor,
  votacao,
  votoNominal,
} from '@/shared/db/schema'

export type Casa = 'CAMARA' | 'SENADO'

export interface FiltrosParlamentar {
  casa?: Casa
  partido?: string
  uf?: string
}

export async function listParlamentares(filtros: FiltrosParlamentar = {}) {
  const whereClauses = []
  if (filtros.casa) whereClauses.push(eq(parlamentar.casa, filtros.casa))
  if (filtros.partido)
    whereClauses.push(eq(parlamentar.partidoSigla, filtros.partido))
  if (filtros.uf) whereClauses.push(eq(parlamentar.uf, filtros.uf))

  return db
    .select({
      id: parlamentar.id,
      nome: parlamentar.nome,
      casa: parlamentar.casa,
      partidoSigla: parlamentar.partidoSigla,
      uf: parlamentar.uf,
      urlFoto: parlamentar.urlFoto,
      legislatura: parlamentar.legislatura,
    })
    .from(parlamentar)
    .where(whereClauses.length > 0 ? and(...whereClauses) : undefined)
    .orderBy(parlamentar.nome)
}

export async function getParlamentarById(id: string) {
  const rows = await db
    .select()
    .from(parlamentar)
    .where(eq(parlamentar.id, id))
    .limit(1)
  return rows[0] ?? null
}

export async function getVotosRecentes(parlamentarId: string, limit = 10) {
  return db
    .select({
      voto: votoNominal.voto,
      votacaoId: votacao.id,
      votacaoSourceId: votacao.sourceId,
      dataHora: votacao.dataHora,
      descricao: votacao.descricao,
      orgao: votacao.orgao,
      casa: votacao.casa,
      aprovada: votacao.aprovada,
    })
    .from(votoNominal)
    .innerJoin(votacao, eq(votacao.id, votoNominal.votacaoId))
    .where(eq(votoNominal.parlamentarId, parlamentarId))
    .orderBy(desc(votacao.dataHora))
    .limit(limit)
}

export async function getProposicoesAutoradas(
  parlamentarId: string,
  limit = 5,
) {
  return db
    .select({
      proposicaoId: proposicao.id,
      tipo: proposicao.tipo,
      numero: proposicao.numero,
      ano: proposicao.ano,
      ementa: proposicao.ementa,
      situacao: proposicao.situacao,
      tipoAutoria: proposicaoAutor.tipoAutoria,
    })
    .from(proposicaoAutor)
    .innerJoin(proposicao, eq(proposicao.id, proposicaoAutor.proposicaoId))
    .where(eq(proposicaoAutor.parlamentarId, parlamentarId))
    .orderBy(desc(proposicao.ano), desc(proposicao.numero))
    .limit(limit)
}

export interface GastoCategoria {
  categoriaDescricao: string
  n: number
  total: string
}

export interface GastosResumo {
  totalGeral: string
  totalRegistros: number
  porCategoria: GastoCategoria[]
}

export async function getGastosResumo(
  parlamentarId: string,
  ano: number,
): Promise<GastosResumo> {
  const rows = await db
    .select({
      categoriaDescricao: gasto.categoriaDescricao,
      n: count(gasto.id),
      total: sum(gasto.valor),
    })
    .from(gasto)
    .where(
      and(
        eq(gasto.parlamentarId, parlamentarId),
        sql`extract(year from ${gasto.dataEmissao}) = ${ano}`,
      ),
    )
    .groupBy(gasto.categoriaDescricao)
    .orderBy(desc(sum(gasto.valor)))

  let totalGeralCents = 0
  let totalRegistros = 0
  const porCategoria: GastoCategoria[] = []
  for (const r of rows) {
    const totalStr = r.total ?? '0'
    // sum() retorna string; somamos em centavos (integer math) para evitar
    // erros de IEEE 754. Total geral cabe folgadamente em Number safe int
    // (R$ 80M/ano da Câmara inteira = ~8e9 centavos << 2^53).
    totalGeralCents += Math.round(Number(totalStr) * 100)
    totalRegistros += r.n
    porCategoria.push({
      categoriaDescricao: r.categoriaDescricao,
      n: r.n,
      total: totalStr,
    })
  }

  const totalGeral = (totalGeralCents / 100).toFixed(2)
  return { totalGeral, totalRegistros, porCategoria }
}

export async function getPartidosDistintos(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ partidoSigla: parlamentar.partidoSigla })
    .from(parlamentar)
    .orderBy(parlamentar.partidoSigla)
  return rows.map((r) => r.partidoSigla)
}

export async function getUfsDistintos(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ uf: parlamentar.uf })
    .from(parlamentar)
    .orderBy(parlamentar.uf)
  return rows.map((r) => r.uf)
}
