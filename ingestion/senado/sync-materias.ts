import {
  isTipoProposicao,
  type TipoProposicao,
} from '../../src/core/proposicao/domain/value-objects/tipo-proposicao.vo'
import { createSyncProposicaoUseCase } from '../../src/lib/container'
import { logger } from '../shared/logger'
import type { SyncResult } from '../shared/types'
import { senadoClient } from './senado-client'
import { ensureArray } from './senado-mapping'
import type {
  SenadoListaMateriasAtualizadasResponse,
  SenadoMateriaAtualizada,
} from './senado-types'

function parseNumDiasArg(): number {
  const idx = process.argv.indexOf('--numdias')
  if (idx !== -1 && process.argv[idx + 1]) {
    const n = Number.parseInt(process.argv[idx + 1], 10)
    if (!Number.isNaN(n) && n > 0) return n
  }
  return 5 // default da própria API
}

/**
 * Mapeia subtipo do Senado para TipoProposicao.
 * Casos comuns: PL, PEC, PLP, PLC (lei da Câmara revisora → mapeado para PL),
 * MPV, PDL, PRC. Demais → OUTRO (ex: REQ-CAS, RQS, INDG).
 */
function mapTipoSenado(siglaSubtipo: string): TipoProposicao {
  const sigla = siglaSubtipo.trim().toUpperCase()
  if (sigla === 'PLC') return 'PL' // Projeto de Lei da Câmara → PL no domínio unificado
  return isTipoProposicao(sigla) ? sigla : 'OUTRO'
}

function parseAno(value: string | undefined): number {
  if (!value) return new Date().getUTCFullYear()
  const n = Number.parseInt(value, 10)
  return Number.isNaN(n) ? new Date().getUTCFullYear() : n
}

function parseNumero(value: string | undefined): number {
  if (!value) return 0
  // Senado às vezes vem com zeros à esquerda ('00066' → 66)
  const n = Number.parseInt(value, 10)
  return Number.isNaN(n) ? 0 : n
}

function parseDataApresentacao(value: string | undefined): string | null {
  if (!value) return null
  // Aceita YYYY-MM-DD; outros formatos passam direto e quem valida é o aggregate.
  return value
}

async function main() {
  const numdias = parseNumDiasArg()
  logger.info('Iniciando sync de matérias do Senado', { numdias })

  const useCase = createSyncProposicaoUseCase()
  const result: SyncResult = {
    source: 'senado-materias',
    started: new Date(),
    finished: new Date(),
    total: 0,
    synced: 0,
    errors: 0,
    errorDetails: [],
  }

  let response: SenadoListaMateriasAtualizadasResponse
  try {
    response = await senadoClient.get<SenadoListaMateriasAtualizadasResponse>(
      `/materia/atualizadas?numdias=${numdias}`,
    )
  } catch (error) {
    logger.error('Falha ao buscar matérias atualizadas', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    process.exit(1)
  }

  const desc = response.ListaMateriasAtualizadas?.Metadados?.Descontinuacao
  if (desc?.DataDesativacaoCompleta) {
    logger.warn(
      'Endpoint /materia/atualizadas em depreciação — migrar para /processo',
      {
        dataDesativacao: desc.DataDesativacaoCompleta,
        substituto: desc.UrlServicoSubstituto,
      },
    )
  }

  const materias = ensureArray<SenadoMateriaAtualizada>(
    response.ListaMateriasAtualizadas?.Materias?.Materia,
  )
  logger.info('Matérias carregadas', { total: materias.length })

  for (const m of materias) {
    result.total++

    const ident = m.IdentificacaoMateria
    if (!ident?.CodigoMateria) {
      result.errors++
      result.errorDetails.push({
        id: 'sem-codigo',
        error: 'IdentificacaoMateria sem CodigoMateria',
      })
      continue
    }

    try {
      const sourceUrl = `https://legis.senado.leg.br/dadosabertos/materia/${ident.CodigoMateria}`
      const ementa = m.DadosBasicosMateria?.EmentaMateria?.trim() || ''

      await useCase.execute({
        idExterno: `senado-${ident.CodigoMateria}`,
        casa: 'SENADO',
        tipo: mapTipoSenado(ident.SiglaSubtipoMateria),
        numero: parseNumero(ident.NumeroMateria),
        ano: parseAno(ident.AnoMateria),
        ementa:
          ementa ||
          ident.DescricaoIdentificacaoMateria ||
          `${ident.SiglaSubtipoMateria} ${ident.NumeroMateria}/${ident.AnoMateria}`,
        ementaDetalhada: m.DadosBasicosMateria?.IndexacaoMateria ?? null,
        dataApresentacao: parseDataApresentacao(
          m.DadosBasicosMateria?.DataApresentacao,
        ),
        // Lista atualizadas não traz autores nem temas; ficam vazios até
        // adicionarmos enrichment via /materia/{codigo}/autoria e /assunto.
        autores: [],
        temas: [],
        // Único sinal de situação na lista é IndicadorTramitando.
        // 'Sim' → TRAMITANDO; 'Não' → DESCONHECIDA (pode ter sido aprovada,
        // arquivada, transformada em norma — não temos como saber daqui).
        situacao:
          ident.IndicadorTramitando === 'Sim' ? 'TRAMITANDO' : 'DESCONHECIDA',
        situacaoDescricao: ident.IndicadorTramitando
          ? `Tramitando: ${ident.IndicadorTramitando}`
          : null,
        urlInteiroTeor: null,
        sourceUrl,
      })
      result.synced++
    } catch (error) {
      result.errors++
      result.errorDetails.push({
        id: `senado-${ident.CodigoMateria}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      logger.error('Erro ao sincronizar matéria', {
        codigo: ident.CodigoMateria,
        error: error instanceof Error ? error.message : 'Unknown',
      })
    }

    if (result.total % 50 === 0) {
      logger.info('Progresso', {
        total: result.total,
        synced: result.synced,
        errors: result.errors,
      })
    }
  }

  result.finished = new Date()
  logger.info('Sync de matérias do Senado concluído', {
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
    logger.error('Falha fatal no sync de matérias do Senado', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
    process.exit(1)
  })
