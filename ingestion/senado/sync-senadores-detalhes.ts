import { createSyncParlamentarUseCase } from '../../src/lib/container'
import { logger } from '../shared/logger'
import type { SyncResult } from '../shared/types'
import { senadoClient } from './senado-client'
import {
  ensureArray,
  mapDescricaoParticipacao,
  mapSenadorToParlamentarCommand,
  parseSenadoDate,
} from './senado-mapping'
import type {
  SenadoComissaoMembro,
  SenadoComissoesResponse,
  SenadoDetalheParlamentarResponse,
  SenadoListaSenadoresResponse,
  SenadoParlamentarResumo,
} from './senado-types'

type ComissaoInput = {
  comissaoId: string
  nomeComissao: string
  tipo: ReturnType<typeof mapDescricaoParticipacao>
  periodoInicio: Date
  periodoFim: Date | null
}

async function fetchComissoes(codigo: string): Promise<ComissaoInput[]> {
  try {
    const response = await senadoClient.get<SenadoComissoesResponse>(
      `/senador/${codigo}/comissoes.json`,
    )
    const membros = ensureArray<SenadoComissaoMembro>(
      response.MembroComissaoParlamentar?.Parlamentar?.MembroComissoes
        ?.Comissao,
    )

    return membros
      .map((m): ComissaoInput | null => {
        const inicio = parseSenadoDate(m.DataInicio)
        if (!inicio) return null
        return {
          comissaoId: m.IdentificacaoComissao.CodigoComissao,
          nomeComissao: `${m.IdentificacaoComissao.SiglaComissao} - ${m.IdentificacaoComissao.NomeComissao}`,
          tipo: mapDescricaoParticipacao(m.DescricaoParticipacao),
          periodoInicio: inicio,
          periodoFim: parseSenadoDate(m.DataFim),
        }
      })
      .filter((c): c is ComissaoInput => c !== null)
  } catch {
    logger.warn('Falha ao buscar comissões do senador', { codigo })
    return []
  }
}

async function main() {
  logger.info('Iniciando sync de detalhes de senadores')

  const useCase = createSyncParlamentarUseCase()
  const result: SyncResult = {
    source: 'senado-senadores-detalhes',
    started: new Date(),
    finished: new Date(),
    total: 0,
    synced: 0,
    errors: 0,
    errorDetails: [],
  }

  const listaResponse = await senadoClient.get<SenadoListaSenadoresResponse>(
    '/senador/lista/atual.json',
  )
  const senadores = ensureArray<SenadoParlamentarResumo>(
    listaResponse.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar,
  )
  logger.info('Senadores carregados para enriquecimento', {
    total: senadores.length,
  })

  for (const senador of senadores) {
    result.total++
    const codigo = senador.IdentificacaoParlamentar?.CodigoParlamentar
    if (!codigo) {
      result.errors++
      result.errorDetails.push({
        id: 'unknown',
        error: 'sem CodigoParlamentar',
      })
      continue
    }

    try {
      const detalheResponse =
        await senadoClient.get<SenadoDetalheParlamentarResponse>(
          `/senador/${codigo}/historico.json`,
        )
      const nomeCompleto =
        detalheResponse.DetalheParlamentar?.Parlamentar
          ?.IdentificacaoParlamentar?.NomeCompletoParlamentar

      const comissoes = await fetchComissoes(codigo)

      const base = mapSenadorToParlamentarCommand(senador)
      await useCase.execute({
        ...base,
        nomeCivil: nomeCompleto ?? base.nomeCivil,
        // Senado não retorna CPF — fica null (já é o default em base)
        comissoes,
      })
      result.synced++
    } catch (error) {
      result.errors++
      result.errorDetails.push({
        id: codigo,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      logger.error('Erro ao enriquecer senador', {
        codigoParlamentar: codigo,
        error: error instanceof Error ? error.message : 'Unknown',
      })
    }

    if (result.total % 20 === 0) {
      logger.info('Progresso de enriquecimento', {
        processed: result.total,
        synced: result.synced,
        errors: result.errors,
      })
    }
  }

  result.finished = new Date()
  logger.info('Sync de detalhes de senadores concluído', {
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
    logger.error('Falha fatal no sync de detalhes de senadores', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    process.exit(1)
  })
