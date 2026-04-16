import { createSyncParlamentarUseCase } from '../../src/lib/container'
import { logger } from '../shared/logger'
import { fetchAllPages } from '../shared/pagination'
import type { SyncResult } from '../shared/types'
import { camaraClient } from './camara-client'
import type {
  CamaraDeputado,
  CamaraPartido,
  CamaraResponse,
} from './camara-types'

async function fetchPartidoMap(): Promise<Map<string, string>> {
  const response = await camaraClient.get<CamaraResponse<CamaraPartido[]>>(
    '/partidos',
    { itens: '100' },
  )
  return new Map(response.dados.map((p) => [p.sigla, p.nome]))
}

async function main() {
  const legislatura = process.argv.includes('--legislatura')
    ? process.argv[process.argv.indexOf('--legislatura') + 1]
    : '57'

  logger.info('Iniciando sync de deputados da Câmara', { legislatura })

  const useCase = createSyncParlamentarUseCase()
  const partidoMap = await fetchPartidoMap()
  logger.info('Mapa de partidos carregado', { total: partidoMap.size })

  const result: SyncResult = {
    source: 'camara-deputados',
    started: new Date(),
    finished: new Date(),
    total: 0,
    synced: 0,
    errors: 0,
    errorDetails: [],
  }

  for await (const page of fetchAllPages<CamaraDeputado>(
    camaraClient,
    '/deputados',
    { idLegislatura: legislatura, itens: '100' },
  )) {
    for (const dep of page) {
      result.total++
      try {
        await useCase.execute({
          idExterno: String(dep.id),
          nome: dep.nome,
          uf: dep.siglaUf,
          partidoSigla: dep.siglaPartido,
          partidoNome: partidoMap.get(dep.siglaPartido) ?? dep.siglaPartido,
          casa: 'CAMARA',
          urlFoto: dep.urlFoto,
          sourceUrl: dep.uri,
        })
        result.synced++
      } catch (error) {
        result.errors++
        result.errorDetails.push({
          id: String(dep.id),
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        logger.error('Erro ao sincronizar deputado', {
          deputadoId: dep.id,
          nome: dep.nome,
          error: error instanceof Error ? error.message : 'Unknown',
        })
      }
    }
  }

  result.finished = new Date()
  logger.info('Sync de deputados concluído', {
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
    logger.error('Falha fatal no sync de deputados', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    process.exit(1)
  })
