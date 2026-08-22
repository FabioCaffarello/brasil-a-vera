import { desc, eq, or, sql } from 'drizzle-orm'

import { escapeIlike, parseProposicaoRef } from '@/lib/busca-parser'
import { cached, TTL } from '@/lib/cache'
import { db } from '@/shared/db'
import { parlamentar, proposicao, votacao } from '@/shared/db/schema'

const LIMIT_POR_SECAO = 10

export interface ResultadosBusca {
  parlamentares: Array<{
    id: string
    nome: string
    casa: string
    partidoSigla: string
    uf: string
    urlFoto: string | null
  }>
  proposicoes: Array<{
    id: string
    tipo: string
    numero: number
    ano: number
    ementa: string
    situacao: string
  }>
  votacoes: Array<{
    id: string
    casa: string
    dataHora: Date | string
    descricao: string
    orgao: string
    aprovada: boolean
    votosSim: number
    votosNao: number
    abstencoes: number
    proposicaoTipo: string | null
    proposicaoNumero: number | null
    proposicaoAno: number | null
  }>
  proposicaoMatchExato: { tipo: string; numero: number; ano: number } | null
}

export async function busca(query: string): Promise<ResultadosBusca> {
  const termo = query.trim()
  if (termo.length < 2) {
    return {
      parlamentares: [],
      proposicoes: [],
      votacoes: [],
      proposicaoMatchExato: null,
    }
  }

  const pattern = escapeIlike(termo)
  const proposicaoRef = parseProposicaoRef(termo)

  // Key em lowercase: as queries são case/accent-insensitive (unaccent+ILIKE),
  // então variantes de caixa do mesmo termo compartilham o slot. O termo do
  // usuário entra na key do Workers Cache API (mesma exposição da própria URL
  // ?q=), nunca em log (#768 encerrou a caça ao ofensor do neon-wake).
  const resultados = await cached(
    `busca:q=${termo.toLowerCase()}`,
    TTL.listagemFiltrada,
    () => buscaUncached(pattern),
  )

  return { ...resultados, proposicaoMatchExato: proposicaoRef }
}

async function buscaUncached(
  pattern: string,
): Promise<Omit<ResultadosBusca, 'proposicaoMatchExato'>> {
  const [parlamentares, proposicoes, votacoes] = await Promise.all([
    db
      .select({
        id: parlamentar.id,
        nome: parlamentar.nome,
        casa: parlamentar.casa,
        partidoSigla: parlamentar.partidoSigla,
        uf: parlamentar.uf,
        urlFoto: parlamentar.urlFoto,
      })
      .from(parlamentar)
      .where(
        or(
          sql`unaccent(${parlamentar.nome}) ILIKE unaccent(${pattern})`,
          sql`unaccent(${parlamentar.nomeCivil}) ILIKE unaccent(${pattern})`,
        ),
      )
      .orderBy(sql`lower(unaccent(${parlamentar.nome}))`)
      .limit(LIMIT_POR_SECAO),

    db
      .select({
        id: proposicao.id,
        tipo: proposicao.tipo,
        numero: proposicao.numero,
        ano: proposicao.ano,
        ementa: proposicao.ementa,
        situacao: proposicao.situacao,
      })
      .from(proposicao)
      .where(sql`unaccent(${proposicao.ementa}) ILIKE unaccent(${pattern})`)
      .orderBy(desc(proposicao.ano), desc(proposicao.numero))
      .limit(LIMIT_POR_SECAO),

    db
      .select({
        id: votacao.id,
        casa: votacao.casa,
        dataHora: votacao.dataHora,
        descricao: votacao.descricao,
        orgao: votacao.orgao,
        aprovada: votacao.aprovada,
        votosSim: votacao.votosSim,
        votosNao: votacao.votosNao,
        abstencoes: votacao.abstencoes,
        proposicaoTipo: proposicao.tipo,
        proposicaoNumero: proposicao.numero,
        proposicaoAno: proposicao.ano,
      })
      .from(votacao)
      .leftJoin(proposicao, eq(proposicao.id, votacao.proposicaoId))
      .where(sql`unaccent(${votacao.descricao}) ILIKE unaccent(${pattern})`)
      .orderBy(desc(votacao.dataHora))
      .limit(LIMIT_POR_SECAO),
  ])

  return { parlamentares, proposicoes, votacoes }
}
