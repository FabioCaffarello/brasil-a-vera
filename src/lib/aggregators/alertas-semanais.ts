// Orquestrador do agregador semanal — Wave 10 Etapa 7.2.
//
// Recebe a alert_policy do usuário e dispara apenas as queries
// correspondentes aos topic_* ligados. Topic discursos não é
// implementado nesta etapa (TODO Wave 11+: precisa de pipeline de
// extração de fala de plenário que ainda não existe).

import type { AlertPolicyFields } from '@/lib/constants/alert-policy'

import {
  fetchDivergenciasParaUsuario,
  fetchGastosParaUsuario,
  fetchProposicoesParaUsuario,
  fetchVotacoesParaUsuario,
} from './queries'
import type { Aggregate } from './types'

export interface AggregateForUserInput {
  userId: string
  periodStart: Date
  periodEnd: Date
  policy: Pick<
    AlertPolicyFields,
    'topicVotacoes' | 'topicGastos' | 'topicProposicoes' | 'topicDivergencias'
  >
}

/**
 * Roda as 4 queries em paralelo (ou subset, dependendo da policy).
 * `topicDiscursos` é deliberadamente ignorado — placeholder no markdown
 * até Wave 11+.
 */
export async function aggregateForUser(
  input: AggregateForUserInput,
): Promise<Aggregate> {
  const { userId, periodStart, periodEnd, policy } = input

  const [votacoes, divergencias, proposicoes, gastos] = await Promise.all([
    policy.topicVotacoes
      ? fetchVotacoesParaUsuario(userId, periodStart, periodEnd)
      : Promise.resolve(undefined),
    policy.topicDivergencias
      ? fetchDivergenciasParaUsuario(userId, periodStart, periodEnd)
      : Promise.resolve(undefined),
    policy.topicProposicoes
      ? fetchProposicoesParaUsuario(userId, periodStart, periodEnd)
      : Promise.resolve(undefined),
    policy.topicGastos
      ? fetchGastosParaUsuario(userId, periodStart, periodEnd)
      : Promise.resolve(undefined),
  ])

  return {
    ...(votacoes !== undefined ? { votacoes } : {}),
    ...(divergencias !== undefined ? { divergencias } : {}),
    ...(proposicoes !== undefined ? { proposicoes } : {}),
    ...(gastos !== undefined ? { gastos } : {}),
  }
}

export type { Aggregate } from './types'
export { isAggregateEmpty } from './types'
