import { createSyncParlamentarUseCase } from '../../src/lib/container'
import { logger } from '../shared/logger'
import type { SyncResult } from '../shared/types'
import { senadoClient } from './senado-client'
import { ensureArray, mapSenadorToParlamentarCommand } from './senado-mapping'
import type {
  SenadoListaSenadoresResponse,
  SenadoParlamentarResumo,
} from './senado-types'

async function main() {
  logger.info('Iniciando sync de senadores')

  const useCase = createSyncParlamentarUseCase()
  const result: SyncResult = {
    source: 'senado-senadores',
    started: new Date(),
    finished: new Date(),
    total: 0,
    synced: 0,
    errors: 0,
    errorDetails: [],
  }

  const response = await senadoClient.get<SenadoListaSenadoresResponse>(
    '/senador/lista/atual.json',
  )

  const senadores = ensureArray<SenadoParlamentarResumo>(
    response.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar,
  )

  logger.info('Senadores carregados', { total: senadores.length })

  for (const senador of senadores) {
    result.total++
    try {
      const command = mapSenadorToParlamentarCommand(senador)
      await useCase.execute(command)
      result.synced++
    } catch (error) {
      result.errors++
      const id =
        senador.IdentificacaoParlamentar?.CodigoParlamentar ?? 'unknown'
      result.errorDetails.push({
        id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      logger.error('Erro ao sincronizar senador', {
        codigoParlamentar: id,
        error: error instanceof Error ? error.message : 'Unknown',
      })
    }
  }

  result.finished = new Date()
  logger.info('Sync de senadores concluído', {
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
    logger.error('Falha fatal no sync de senadores', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    process.exit(1)
  })
