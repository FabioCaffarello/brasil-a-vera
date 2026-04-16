import { createSyncVotacaoUseCase } from '../../src/lib/container'
import { logger } from '../shared/logger'
import type { SyncResult } from '../shared/types'
import { senadoClient } from './senado-client'
import { ensureArray, mapVotacaoSenadoToCommand } from './senado-mapping'
import type { SenadoListaVotacoesResponse, SenadoVotacao } from './senado-types'

function parseAnosArg(): string[] {
  const anos: string[] = []
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--ano' && process.argv[i + 1]) {
      anos.push(process.argv[i + 1])
    }
  }
  if (anos.length === 0) {
    anos.push(String(new Date().getFullYear()))
  }
  return anos
}

async function main() {
  const anos = parseAnosArg()
  logger.info('Iniciando sync de votações do Senado', { anos })

  const useCase = createSyncVotacaoUseCase()
  const result: SyncResult = {
    source: 'senado-votacoes',
    started: new Date(),
    finished: new Date(),
    total: 0,
    synced: 0,
    errors: 0,
    errorDetails: [],
  }

  let secretasCount = 0

  for (const ano of anos) {
    logger.info('Buscando votações do ano', { ano })

    let response: SenadoListaVotacoesResponse
    try {
      response = await senadoClient.get<SenadoListaVotacoesResponse>(
        `/dados/ListaVotacoes${ano}.json`,
      )
    } catch (error) {
      logger.error('Falha ao buscar lista de votações', {
        ano,
        error: error instanceof Error ? error.message : 'Unknown',
      })
      continue
    }

    const votacoes = ensureArray<SenadoVotacao>(
      response.ListaVotacoes?.Votacoes?.Votacao,
    )
    logger.info('Votações carregadas', { ano, total: votacoes.length })

    for (const votacao of votacoes) {
      result.total++
      if (votacao.Secreta === 'S') {
        secretasCount++
      }

      try {
        const command = mapVotacaoSenadoToCommand(votacao)
        await useCase.execute(command)
        result.synced++
      } catch (error) {
        result.errors++
        result.errorDetails.push({
          id: `senado-${votacao.CodigoSessaoVotacao}`,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }

      if (result.total % 50 === 0) {
        logger.info('Progresso', {
          ano,
          total: result.total,
          synced: result.synced,
          errors: result.errors,
        })
      }
    }
  }

  result.finished = new Date()
  logger.info('Estatísticas do sync', {
    totalVotacoes: result.total,
    votacoesSecretas: secretasCount,
    votacoesAbertas: result.total - secretasCount,
  })
  logger.info('Sync de votações do Senado concluído', {
    ...result,
    durationMs: result.finished.getTime() - result.started.getTime(),
  })

  if (result.errors > 0) {
    logger.error('Resumo de erros', {
      totalErrors: result.errors,
      primeiros10: result.errorDetails.slice(0, 10),
    })
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Falha fatal no sync de votações do Senado', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    process.exit(1)
  })
