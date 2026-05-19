// Queries de agregação para o report semanal — Wave 10 Etapa 7.2.
//
// 4 sinais (correspondem aos topic_* da alert_policy):
//   - votacoes:    votos nominais dos acompanhados na semana
//   - divergencias:votos contrários à orientação da bancada
//   - proposicoes: tramitação de proposições onde acompanhado é autor
//   - gastos:      gastos publicados de acompanhados no período
//
// Notas de performance:
//   - Cada query é executada uma vez por usuário no cron. Volume Wave 10
//     ≤ 750 MAU × 4 ≈ 3000 queries por execução semanal — confortável
//     no Neon free tier (3 GB / 100h compute).
//   - Limits defensivos por query para evitar payload gigantesco se o
//     usuário acompanha muitos parlamentares ativos.

import { and, between, count, desc, eq, gte, ne, sql } from 'drizzle-orm'

import { gasto } from '@/modules/gastos/domain/schema'
import { parlamentar } from '@/modules/parlamentares/domain/schema'
import {
  proposicao,
  proposicaoAutor,
  tramitacao,
} from '@/modules/proposicoes/domain/schema'
import { follows } from '@/modules/usuario/domain/schema'
import {
  orientacao,
  votacao,
  votoNominal,
} from '@/modules/votacoes/domain/schema'
import { db } from '@/shared/db'

import type {
  DivergenciaItem,
  GastoItem,
  ProposicaoItem,
  VotacaoItem,
} from './types'

const VOTACOES_LIMIT = 50
const DIVERGENCIAS_LIMIT = 50
const PROPOSICOES_LIMIT = 30
const GASTOS_LIMIT = 30

/**
 * Votos nominais dos parlamentares acompanhados em votações cujo
 * `data_hora` cai no período. Agrupa por votação (uma linha do output
 * = uma votação, com sub-lista dos votos individuais dos acompanhados).
 */
export async function fetchVotacoesParaUsuario(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<VotacaoItem[]> {
  const rows = await db
    .select({
      votacaoId: votacao.id,
      descricao: votacao.descricao,
      casa: votacao.casa,
      dataHora: votacao.dataHora,
      aprovada: votacao.aprovada,
      votosSim: votacao.votosSim,
      votosNao: votacao.votosNao,
      parlamentarId: parlamentar.id,
      parlamentarNome: parlamentar.nome,
      partidoSigla: parlamentar.partidoSigla,
      voto: votoNominal.voto,
    })
    .from(votoNominal)
    .innerJoin(votacao, eq(votoNominal.votacaoId, votacao.id))
    .innerJoin(parlamentar, eq(votoNominal.parlamentarId, parlamentar.id))
    .innerJoin(
      follows,
      and(
        eq(follows.parlamentarId, votoNominal.parlamentarId),
        eq(follows.userId, userId),
      ),
    )
    .where(between(votacao.dataHora, periodStart, periodEnd))
    .orderBy(desc(votacao.dataHora))
    .limit(VOTACOES_LIMIT * 10) // 10 acompanhados por votação no pior caso

  // Agrupa por votação.
  const byVotacao = new Map<string, VotacaoItem>()
  for (const row of rows) {
    let item = byVotacao.get(row.votacaoId)
    if (!item) {
      item = {
        votacaoId: row.votacaoId,
        descricao: row.descricao,
        casa: row.casa,
        dataHora: row.dataHora,
        aprovada: row.aprovada,
        votosSim: row.votosSim,
        votosNao: row.votosNao,
        porParlamentar: [],
      }
      byVotacao.set(row.votacaoId, item)
    }
    item.porParlamentar.push({
      parlamentarId: row.parlamentarId,
      parlamentarNome: row.parlamentarNome,
      partidoSigla: row.partidoSigla,
      voto: row.voto,
    })
  }

  return Array.from(byVotacao.values()).slice(0, VOTACOES_LIMIT)
}

/**
 * Votos divergentes da orientação da bancada. Considera apenas
 * orientações de "lado" (SIM, NAO, ABSTENCAO) — quando a bancada
 * libera ('LIBERADO'), não há divergência possível por definição.
 */
export async function fetchDivergenciasParaUsuario(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<DivergenciaItem[]> {
  const rows = await db
    .select({
      votacaoId: votacao.id,
      votacaoDescricao: votacao.descricao,
      votacaoDataHora: votacao.dataHora,
      parlamentarId: parlamentar.id,
      parlamentarNome: parlamentar.nome,
      partidoSigla: parlamentar.partidoSigla,
      orientacaoBancada: orientacao.orientacao,
      votoIndividual: votoNominal.voto,
    })
    .from(votoNominal)
    .innerJoin(votacao, eq(votoNominal.votacaoId, votacao.id))
    .innerJoin(parlamentar, eq(votoNominal.parlamentarId, parlamentar.id))
    .innerJoin(
      follows,
      and(
        eq(follows.parlamentarId, votoNominal.parlamentarId),
        eq(follows.userId, userId),
      ),
    )
    .innerJoin(
      orientacao,
      and(
        eq(orientacao.votacaoId, votoNominal.votacaoId),
        eq(orientacao.partidoSigla, parlamentar.partidoSigla),
      ),
    )
    .where(
      and(
        between(votacao.dataHora, periodStart, periodEnd),
        // Cast enum → text para comparação tipo↔tipo (Drizzle/Postgres
        // não permite enum vs enum direto quando os enums têm overlap
        // mas tipos distintos). Esta é a forma idiomática em Drizzle.
        ne(sql`${votoNominal.voto}::text`, sql`${orientacao.orientacao}::text`),
        // Ignora orientação "LIBERADO" — não há divergência semântica
        // quando a bancada liberou o voto.
        ne(orientacao.orientacao, 'LIBERADO'),
      ),
    )
    .orderBy(desc(votacao.dataHora))
    .limit(DIVERGENCIAS_LIMIT)

  return rows
}

/**
 * Proposições onde algum parlamentar acompanhado é autor E que tiveram
 * tramitação no período. Cada linha do output = uma proposição com a
 * tramitação mais recente do período (se houver).
 */
export async function fetchProposicoesParaUsuario(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<ProposicaoItem[]> {
  // Subquery: última tramitação por proposição no período.
  const ultTram = db
    .select({
      proposicaoId: tramitacao.proposicaoId,
      data: sql<Date>`MAX(${tramitacao.data})`.as('ult_data'),
    })
    .from(tramitacao)
    .where(between(tramitacao.data, periodStart, periodEnd))
    .groupBy(tramitacao.proposicaoId)
    .as('ult_tram')

  const rows = await db
    .select({
      proposicaoId: proposicao.id,
      tipo: proposicao.tipo,
      numero: proposicao.numero,
      ano: proposicao.ano,
      ementa: proposicao.ementa,
      autorParlamentarId: proposicaoAutor.parlamentarId,
      autorNome: proposicaoAutor.nome,
      ultimaTramitacaoData: ultTram.data,
      ultimaTramitacaoDescricao: tramitacao.descricaoResumida,
    })
    .from(proposicao)
    .innerJoin(proposicaoAutor, eq(proposicaoAutor.proposicaoId, proposicao.id))
    .innerJoin(
      follows,
      and(
        eq(follows.parlamentarId, proposicaoAutor.parlamentarId),
        eq(follows.userId, userId),
      ),
    )
    .innerJoin(ultTram, eq(ultTram.proposicaoId, proposicao.id))
    .leftJoin(
      tramitacao,
      and(
        eq(tramitacao.proposicaoId, proposicao.id),
        eq(tramitacao.data, ultTram.data),
      ),
    )
    .orderBy(desc(ultTram.data))
    .limit(PROPOSICOES_LIMIT)

  return rows.map((r) => ({
    proposicaoId: r.proposicaoId,
    tipo: r.tipo,
    numero: r.numero,
    ano: r.ano,
    ementa: r.ementa,
    autorParlamentarId: r.autorParlamentarId ?? '',
    autorNome: r.autorNome,
    ultimaTramitacaoData: r.ultimaTramitacaoData,
    ultimaTramitacaoDescricao: r.ultimaTramitacaoDescricao,
  }))
}

/**
 * Gastos publicados no período cuja `data_emissao` cai entre as datas
 * dadas, dos parlamentares acompanhados. Ordenado por valor desc para
 * facilitar o top do composer.
 */
export async function fetchGastosParaUsuario(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<GastoItem[]> {
  // gasto.dataEmissao é `date` (sem timezone). Comparação com Date JS
  // OK — Drizzle/Postgres converte ISO string corretamente. Usar gte
  // + lt para evitar surpresa de inclusive/exclusive.
  const rows = await db
    .select({
      parlamentarId: parlamentar.id,
      parlamentarNome: parlamentar.nome,
      valor: gasto.valor,
      categoriaDescricao: gasto.categoriaDescricao,
      fornecedorNome: gasto.fornecedorNome,
      dataEmissao: gasto.dataEmissao,
    })
    .from(gasto)
    .innerJoin(parlamentar, eq(gasto.parlamentarId, parlamentar.id))
    .innerJoin(
      follows,
      and(
        eq(follows.parlamentarId, gasto.parlamentarId),
        eq(follows.userId, userId),
      ),
    )
    .where(
      and(
        gte(
          gasto.dataEmissao,
          periodStart.toISOString().slice(0, 10), // YYYY-MM-DD
        ),
        sql`${gasto.dataEmissao} <= ${periodEnd.toISOString().slice(0, 10)}`,
      ),
    )
    .orderBy(desc(gasto.valor))
    .limit(GASTOS_LIMIT)

  return rows.map((r) => ({
    parlamentarId: r.parlamentarId,
    parlamentarNome: r.parlamentarNome,
    valor: r.valor,
    categoriaDescricao: r.categoriaDescricao,
    fornecedorNome: r.fornecedorNome,
    // gasto.dataEmissao é date — Drizzle devolve string YYYY-MM-DD;
    // converte para Date para uniformidade com os outros agregados.
    dataEmissao: new Date(`${r.dataEmissao}T00:00:00.000Z`),
  }))
}

/**
 * Pré-check: usuário tem ao menos 1 follow ativo? Se não, agregador
 * pode pular sem rodar queries (otimização).
 */
export async function userHasAnyFollows(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ n: count() })
    .from(follows)
    .where(eq(follows.userId, userId))
    .limit(1)
  return (row?.n ?? 0) > 0
}
