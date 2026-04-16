import {
  isSituacaoProposicao,
  type SituacaoProposicao,
} from '../../src/core/proposicao/domain/value-objects/situacao-proposicao.vo'
import {
  isTipoProposicao,
  type TipoProposicao,
} from '../../src/core/proposicao/domain/value-objects/tipo-proposicao.vo'
import { createSyncProposicaoUseCase } from '../../src/lib/container'
import { logger } from '../shared/logger'
import { fetchAllPages } from '../shared/pagination'
import type { SyncResult } from '../shared/types'
import { camaraClient } from './camara-client'
import type {
  CamaraAutor,
  CamaraProposicaoDetalhe,
  CamaraProposicaoResumo,
  CamaraResponse,
  CamaraStatusProposicao,
  CamaraTema,
} from './camara-types'

function parseDesdeArg(): string {
  const idx = process.argv.indexOf('--desde')
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1]
  }
  // Default: últimos 30 dias
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 30)
  return d.toISOString().split('T')[0]
}

function parseLegislaturaArg(): string | null {
  const idx = process.argv.indexOf('--legislatura')
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1]
  return null
}

/**
 * Mapeia siglaTipo da Câmara para TipoProposicao do domain.
 * Tipos não suportados (RIC, INC, etc.) caem em 'OUTRO'.
 */
function mapTipoCamara(siglaTipo: string): TipoProposicao {
  const sigla = siglaTipo.trim().toUpperCase()
  return isTipoProposicao(sigla) ? sigla : 'OUTRO'
}

/**
 * Heurística de mapeamento de situação a partir do texto livre da API.
 * A API não fornece um enum estável; trabalhamos com substring matching.
 */
function mapSituacaoCamara(
  status: CamaraStatusProposicao | null,
): SituacaoProposicao {
  const desc = (status?.descricaoSituacao ?? '').toLowerCase()
  if (!desc) return 'DESCONHECIDA'
  if (desc.includes('aprovad')) return 'APROVADA'
  if (desc.includes('rejeitad')) return 'REJEITADA'
  if (desc.includes('arquivad')) return 'ARQUIVADA'
  if (desc.includes('transformad')) return 'TRANSFORMADA_EM_NORMA'
  return 'TRAMITANDO'
}

/**
 * Defensivo: reusa o validador para garantir que algum campo desconhecido
 * (tipo novo etc.) não passe sem alerta.
 */
function ensureSituacao(value: string): SituacaoProposicao {
  return isSituacaoProposicao(value) ? value : 'DESCONHECIDA'
}

async function fetchTemas(propId: number): Promise<CamaraTema[]> {
  try {
    const response = await camaraClient.get<CamaraResponse<CamaraTema[]>>(
      `/proposicoes/${propId}/temas`,
    )
    return response.dados ?? []
  } catch {
    logger.warn('Falha ao buscar temas', { propId })
    return []
  }
}

async function fetchAutores(propId: number): Promise<string[]> {
  try {
    const response = await camaraClient.get<CamaraResponse<CamaraAutor[]>>(
      `/proposicoes/${propId}/autores`,
    )
    return (response.dados ?? [])
      .sort((a, b) => a.ordemAssinatura - b.ordemAssinatura)
      .map((a) => a.nome)
  } catch {
    logger.warn('Falha ao buscar autores', { propId })
    return []
  }
}

async function main() {
  const dataInicio = parseDesdeArg()
  const legislatura = parseLegislaturaArg()

  logger.info('Iniciando sync de proposições da Câmara', {
    dataInicio,
    legislatura,
  })

  const useCase = createSyncProposicaoUseCase()
  const result: SyncResult = {
    source: 'camara-proposicoes',
    started: new Date(),
    finished: new Date(),
    total: 0,
    synced: 0,
    errors: 0,
    errorDetails: [],
  }

  let processedCount = 0

  // A API recusa idLegislatura + dataInicio na mesma chamada (HTTP 400).
  // Por padrão filtramos por dataInicio (necessário p/ ingestão incremental);
  // idLegislatura só é incluído quando o operador o passa explicitamente
  // E não houver --desde (ex.: `--legislatura=56` sem `--desde`).
  const queryParams: Record<string, string> = {
    // Nome oficial do parâmetro é `dataInicio` (NÃO `dataApresentacaoInicio`).
    // Confirmado em CamaraDosDeputados/dados-abertos#128 e fonte oficial.
    dataInicio,
    itens: '100',
    ordenarPor: 'id',
    ordem: 'DESC',
  }
  if (legislatura) {
    logger.warn(
      'Ignorando --legislatura: a API rejeita idLegislatura+dataInicio na mesma chamada',
      { legislatura },
    )
  }

  for await (const page of fetchAllPages<CamaraProposicaoResumo>(
    camaraClient,
    '/proposicoes',
    queryParams,
  )) {
    for (const resumo of page) {
      result.total++
      processedCount++

      // A API retorna alguns registros operacionais (RPD = Votação Nominal,
      // alguns RIC, etc.) com `ano: 0` — não são proposições no sentido
      // estrito do domínio. O validador (corretamente) exige ano > 0, então
      // filtramos aqui antes de tentar criar a entidade. Isso evita um cascade
      // de "Entity validation failed" no log e mantém o validator rigoroso.
      if (!resumo.ano || resumo.ano <= 0) {
        logger.warn('Proposição ignorada: ano inválido', {
          propId: resumo.id,
          siglaTipo: resumo.siglaTipo,
          ano: resumo.ano,
        })
        continue
      }

      try {
        const detalheResponse = await camaraClient.get<
          CamaraResponse<CamaraProposicaoDetalhe>
        >(`/proposicoes/${resumo.id}`)
        const detalhe = detalheResponse.dados

        const [temas, autores] = await Promise.all([
          fetchTemas(resumo.id),
          fetchAutores(resumo.id),
        ])

        const situacao = ensureSituacao(
          mapSituacaoCamara(detalhe.statusProposicao),
        )

        await useCase.execute({
          idExterno: `camara-${resumo.id}`,
          casa: 'CAMARA',
          tipo: mapTipoCamara(resumo.siglaTipo),
          numero: resumo.numero,
          ano: resumo.ano,
          ementa:
            resumo.ementa ||
            `${resumo.siglaTipo} ${resumo.numero}/${resumo.ano}`,
          ementaDetalhada: detalhe.ementaDetalhada || null,
          dataApresentacao:
            detalhe.dataApresentacao ?? resumo.dataApresentacao ?? null,
          autores,
          temas: temas.map((t) => ({ codigoOficial: t.codTema, nome: t.tema })),
          situacao,
          situacaoDescricao:
            detalhe.statusProposicao?.descricaoSituacao ?? null,
          urlInteiroTeor: detalhe.urlInteiroTeor ?? null,
          sourceUrl: resumo.uri,
        })
        result.synced++
      } catch (error) {
        result.errors++
        result.errorDetails.push({
          id: String(resumo.id),
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        logger.error('Erro ao sincronizar proposição', {
          propId: resumo.id,
          error: error instanceof Error ? error.message : 'Unknown',
        })
      }

      if (processedCount % 10 === 0) {
        logger.info('Progresso de proposições', {
          processedCount,
          total: result.total,
          errors: result.errors,
        })
      }
    }
  }

  result.finished = new Date()
  logger.info('Sync de proposições concluído', {
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
    logger.error('Falha fatal no sync de proposições', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    process.exit(1)
  })
