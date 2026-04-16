import type { TipoOrientacao } from '../../src/core/votacao/domain/value-objects/tipo-orientacao.vo'
import { createSyncVotacaoUseCase } from '../../src/lib/container'
import { logger } from '../shared/logger'
import { fetchAllPages } from '../shared/pagination'
import type { SyncResult } from '../shared/types'
import { camaraClient } from './camara-client'
import {
  extractIdFromUri,
  mapTipoOrientacao,
  mapTipoVoto,
} from './camara-mapping'
import type {
  CamaraOrientacao,
  CamaraResponse,
  CamaraVotacaoResumo,
  CamaraVoto,
} from './camara-types'

function parseDesdeArg(): string {
  const idx = process.argv.indexOf('--desde')
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1]
  }
  return '2023-01-01'
}

async function main() {
  const dataInicio = parseDesdeArg()

  logger.info('Iniciando sync de votações da Câmara', { dataInicio })

  const useCase = createSyncVotacaoUseCase()
  const result: SyncResult = {
    source: 'camara-votacoes',
    started: new Date(),
    finished: new Date(),
    total: 0,
    synced: 0,
    errors: 0,
    errorDetails: [],
  }

  let processedCount = 0

  for await (const page of fetchAllPages<CamaraVotacaoResumo>(
    camaraClient,
    '/votacoes',
    {
      dataInicio,
      itens: '100',
      ordenarPor: 'dataHoraRegistro',
      ordem: 'DESC',
    },
  )) {
    for (const votacao of page) {
      result.total++
      processedCount++

      try {
        const votosResponse = await camaraClient.get<
          CamaraResponse<CamaraVoto[]>
        >(`/votacoes/${votacao.id}/votos`)

        const votosRaw = votosResponse.dados ?? []

        if (votosRaw.length === 0) {
          logger.warn('Votação sem votos nominais', {
            votacaoId: votacao.id,
          })
        }

        const votos = votosRaw.map((v) => ({
          parlamentarIdExterno: String(v.deputado_.id),
          tipoVoto: mapTipoVoto(v.tipoVoto),
          dataHora: v.dataRegistroVoto ? new Date(v.dataRegistroVoto) : null,
        }))

        let orientacoes: Array<{
          partidoSigla: string
          orientacao: TipoOrientacao
        }> = []
        try {
          const orientacoesResponse = await camaraClient.get<
            CamaraResponse<CamaraOrientacao[]>
          >(`/votacoes/${votacao.id}/orientacoes`)

          orientacoes = (orientacoesResponse.dados ?? [])
            .map((o) => {
              const mapped = mapTipoOrientacao(o.orientacao)
              if (!mapped) return null
              return {
                partidoSigla: o.siglaPartidoBloco,
                orientacao: mapped,
              }
            })
            .filter(
              (o): o is { partidoSigla: string; orientacao: TipoOrientacao } =>
                o !== null,
            )
        } catch {
          logger.warn('Falha ao buscar orientações', {
            votacaoId: votacao.id,
          })
        }

        const votosSim = votos.filter((v) => v.tipoVoto === 'SIM').length
        const votosNao = votos.filter((v) => v.tipoVoto === 'NAO').length
        const abstencoes = votos.filter(
          (v) => v.tipoVoto === 'ABSTENCAO',
        ).length
        const ausentes = votos.filter((v) => v.tipoVoto === 'AUSENTE').length

        const dataHora = votacao.dataHoraRegistro
          ? new Date(votacao.dataHoraRegistro)
          : new Date(votacao.data)

        await useCase.execute({
          idExterno: votacao.id,
          proposicaoIdExterno: extractIdFromUri(votacao.uriProposicaoObjeto),
          dataHora,
          descricao: votacao.descricao || `Votação ${votacao.id}`,
          orgao: votacao.siglaOrgao,
          votosSim,
          votosNao,
          abstencoes,
          ausentes,
          aprovada: votacao.aprovacao === 1,
          sourceUrl: votacao.uri,
          votos,
          orientacoes,
        })

        result.synced++
      } catch (error) {
        result.errors++
        result.errorDetails.push({
          id: votacao.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        logger.error('Erro ao sincronizar votação', {
          votacaoId: votacao.id,
          error: error instanceof Error ? error.message : 'Unknown',
        })
      }

      if (processedCount % 10 === 0) {
        logger.info('Progresso de votações', {
          processedCount,
          total: result.total,
          errors: result.errors,
        })
      }
    }
  }

  result.finished = new Date()
  logger.info('Sync de votações concluído', {
    ...result,
    durationMs: result.finished.getTime() - result.started.getTime(),
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Falha fatal no sync de votações', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    process.exit(1)
  })
