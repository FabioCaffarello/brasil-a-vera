import { createSyncParlamentarUseCase } from '../../src/lib/container'
import { logger } from '../shared/logger'
import { fetchAllPages } from '../shared/pagination'
import type { SyncResult } from '../shared/types'
import { camaraClient } from './camara-client'
import { mapTituloToTipoParticipacao } from './camara-mapping'
import type {
  CamaraDeputado,
  CamaraDeputadoDetalhes,
  CamaraOrgaoDeputado,
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

  logger.info('Iniciando sync de detalhes de deputados da Câmara', {
    legislatura,
  })

  const useCase = createSyncParlamentarUseCase()
  const partidoMap = await fetchPartidoMap()

  const result: SyncResult = {
    source: 'camara-deputados-detalhes',
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

  logger.info('Deputados carregados para enriquecimento', {
    total: deputados.length,
  })

  for (const dep of deputados) {
    result.total++

    try {
      const detalhesResponse = await camaraClient.get<
        CamaraResponse<CamaraDeputadoDetalhes>
      >(`/deputados/${dep.id}`)
      const detalhes = detalhesResponse.dados

      let comissoes: Array<{
        comissaoId: string
        nomeComissao: string
        tipo: ReturnType<typeof mapTituloToTipoParticipacao>
        periodoInicio: Date
        periodoFim: Date | null
      }> = []

      try {
        const orgaosResponse = await camaraClient.get<
          CamaraResponse<CamaraOrgaoDeputado[]>
        >(`/deputados/${dep.id}/orgaos`)

        comissoes = (orgaosResponse.dados ?? []).map((o) => ({
          comissaoId: String(o.idOrgao),
          nomeComissao: o.nomeOrgao,
          tipo: mapTituloToTipoParticipacao(o.titulo),
          periodoInicio: new Date(o.dataInicio),
          periodoFim: o.dataFim ? new Date(o.dataFim) : null,
        }))
      } catch {
        logger.warn('Falha ao buscar órgãos do deputado', {
          deputadoId: dep.id,
        })
      }

      await useCase.execute({
        idExterno: String(dep.id),
        nome: dep.nome,
        nomeCivil: detalhes.nomeCivil,
        cpf: detalhes.cpf,
        uf: dep.siglaUf,
        partidoSigla: dep.siglaPartido,
        partidoNome: partidoMap.get(dep.siglaPartido) ?? dep.siglaPartido,
        casa: 'CAMARA',
        urlFoto: dep.urlFoto,
        sourceUrl: dep.uri,
        comissoes,
      })

      result.synced++
    } catch (error) {
      result.errors++
      result.errorDetails.push({
        id: String(dep.id),
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      logger.error('Erro ao enriquecer deputado', {
        deputadoId: dep.id,
        nome: dep.nome,
        error: error instanceof Error ? error.message : 'Unknown',
      })
    }

    if (result.total % 50 === 0) {
      logger.info('Progresso de enriquecimento', {
        processed: result.total,
        synced: result.synced,
        errors: result.errors,
      })
    }
  }

  result.finished = new Date()
  logger.info('Sync de detalhes de deputados concluído', {
    ...result,
    durationMs: result.finished.getTime() - result.started.getTime(),
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Falha fatal no sync de detalhes de deputados', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    process.exit(1)
  })
