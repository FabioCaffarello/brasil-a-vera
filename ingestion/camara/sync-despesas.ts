import { createSyncGastoUseCase } from '../../src/lib/container'
import { logger } from '../shared/logger'
import { fetchAllPages } from '../shared/pagination'
import type { SyncResult } from '../shared/types'
import { camaraClient } from './camara-client'
import { mapDespesaToGastoCommand } from './camara-mapping'
import type { CamaraDeputado, CamaraDespesa } from './camara-types'

function parseAnosArg(): string[] {
  const anos: string[] = []
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--ano' && process.argv[i + 1]) {
      anos.push(process.argv[i + 1])
    }
  }
  if (anos.length === 0) {
    const now = new Date()
    anos.push(String(now.getFullYear()))
  }
  return anos
}

async function main() {
  const legislatura = process.argv.includes('--legislatura')
    ? process.argv[process.argv.indexOf('--legislatura') + 1]
    : '57'

  const anos = parseAnosArg()

  logger.info('Iniciando sync de despesas da Câmara', { legislatura, anos })

  const useCase = createSyncGastoUseCase()

  const result: SyncResult = {
    source: 'camara-despesas',
    started: new Date(),
    finished: new Date(),
    total: 0,
    synced: 0,
    errors: 0,
    errorDetails: [],
  }

  const deputados: CamaraDeputado[] = []
  for await (const page of fetchAllPages<CamaraDeputado>(
    camaraClient,
    '/deputados',
    { idLegislatura: legislatura, itens: '100' },
  )) {
    deputados.push(...page)
  }

  logger.info('Deputados carregados para busca de despesas', {
    total: deputados.length,
  })

  let deputadoCount = 0

  for (const dep of deputados) {
    deputadoCount++

    try {
      for await (const page of fetchAllPages<CamaraDespesa>(
        camaraClient,
        `/deputados/${dep.id}/despesas`,
        { ano: anos, itens: '100', ordenarPor: 'ano', ordem: 'DESC' },
      )) {
        for (const despesa of page) {
          result.total++

          try {
            const command = mapDespesaToGastoCommand(despesa, String(dep.id))
            await useCase.execute(command)
            result.synced++
          } catch (error) {
            result.errors++
            result.errorDetails.push({
              id: `${dep.id}-${despesa.codDocumento}`,
              error: error instanceof Error ? error.message : 'Unknown error',
            })
          }
        }
      }
    } catch (error) {
      logger.error('Erro ao buscar despesas do deputado', {
        deputadoId: dep.id,
        error: error instanceof Error ? error.message : 'Unknown',
      })
    }

    if (deputadoCount % 50 === 0) {
      logger.info('Progresso de despesas', {
        deputados: `${deputadoCount}/${deputados.length}`,
        total: result.total,
        synced: result.synced,
        errors: result.errors,
      })
    }
  }

  result.finished = new Date()
  logger.info('Sync de despesas concluído', {
    ...result,
    durationMs: result.finished.getTime() - result.started.getTime(),
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Falha fatal no sync de despesas', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    process.exit(1)
  })
