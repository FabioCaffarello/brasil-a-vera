import { ListGastosUseCase } from '@/core/gasto/application/use-cases/list-gastos/list-gastos.use-case'
import { SyncGastoUseCase } from '@/core/gasto/application/use-cases/sync-gasto/sync-gasto.use-case'
import { GastoDrizzleRepository } from '@/core/gasto/infra/db/drizzle/gasto-drizzle.repository'
import { GetParlamentarUseCase } from '@/core/parlamentar/application/use-cases/get-parlamentar/get-parlamentar.use-case'
import { ListParlamentaresUseCase } from '@/core/parlamentar/application/use-cases/list-parlamentares/list-parlamentares.use-case'
import { SyncParlamentarUseCase } from '@/core/parlamentar/application/use-cases/sync-parlamentar/sync-parlamentar.use-case'
import { ParlamentarDrizzleRepository } from '@/core/parlamentar/infra/db/drizzle/parlamentar-drizzle.repository'
import { GetProposicaoUseCase } from '@/core/proposicao/application/use-cases/get-proposicao/get-proposicao.use-case'
import { ListProposicoesUseCase } from '@/core/proposicao/application/use-cases/list-proposicoes/list-proposicoes.use-case'
import { SyncProposicaoUseCase } from '@/core/proposicao/application/use-cases/sync-proposicao/sync-proposicao.use-case'
import { ProposicaoDrizzleRepository } from '@/core/proposicao/infra/db/drizzle/proposicao-drizzle.repository'
import { GetVotacaoUseCase } from '@/core/votacao/application/use-cases/get-votacao/get-votacao.use-case'
import { ListVotacoesUseCase } from '@/core/votacao/application/use-cases/list-votacoes/list-votacoes.use-case'
import { SyncVotacaoUseCase } from '@/core/votacao/application/use-cases/sync-votacao/sync-votacao.use-case'
import { VotacaoDrizzleRepository } from '@/core/votacao/infra/db/drizzle/votacao-drizzle.repository'
import { db } from '@/shared/db'

// --- Parlamentar ---

export function createParlamentarRepository() {
  return new ParlamentarDrizzleRepository(db)
}

export function createGetParlamentarUseCase() {
  return new GetParlamentarUseCase(createParlamentarRepository())
}

export function createListParlamentaresUseCase() {
  return new ListParlamentaresUseCase(createParlamentarRepository())
}

export function createSyncParlamentarUseCase() {
  return new SyncParlamentarUseCase(createParlamentarRepository())
}

// --- Votacao ---

export function createVotacaoRepository() {
  return new VotacaoDrizzleRepository(db)
}

export function createGetVotacaoUseCase() {
  return new GetVotacaoUseCase(createVotacaoRepository())
}

export function createListVotacoesUseCase() {
  return new ListVotacoesUseCase(createVotacaoRepository())
}

export function createSyncVotacaoUseCase() {
  return new SyncVotacaoUseCase(createVotacaoRepository())
}

// --- Gasto ---

export function createGastoRepository() {
  return new GastoDrizzleRepository(db)
}

export function createSyncGastoUseCase() {
  return new SyncGastoUseCase(createGastoRepository())
}

export function createListGastosUseCase() {
  return new ListGastosUseCase(createGastoRepository())
}

// --- Proposicao ---

export function createProposicaoRepository() {
  return new ProposicaoDrizzleRepository(db)
}

export function createSyncProposicaoUseCase() {
  return new SyncProposicaoUseCase(createProposicaoRepository())
}

export function createGetProposicaoUseCase() {
  return new GetProposicaoUseCase(createProposicaoRepository())
}

export function createListProposicoesUseCase() {
  return new ListProposicoesUseCase(createProposicaoRepository())
}
