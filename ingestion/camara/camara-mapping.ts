import type { GastoCreateCommand } from '../../src/core/gasto/domain/gasto.aggregate'
import type { TipoParticipacao } from '../../src/core/parlamentar/domain/value-objects/tipo-participacao.vo'
import type { TipoOrientacao } from '../../src/core/votacao/domain/value-objects/tipo-orientacao.vo'
import type { TipoVoto } from '../../src/core/votacao/domain/value-objects/tipo-voto.vo'
import { logger } from '../shared/logger'
import type { CamaraDespesa } from './camara-types'

const TIPO_VOTO_MAP: Record<string, TipoVoto> = {
  Sim: 'SIM',
  Não: 'NAO',
  Abstenção: 'ABSTENCAO',
  Obstrução: 'OBSTRUCAO',
}

const TIPO_ORIENTACAO_MAP: Record<string, TipoOrientacao> = {
  Sim: 'SIM',
  Não: 'NAO',
  Liberado: 'LIBERADO',
  Obstrução: 'OBSTRUCAO',
}

export function mapTipoVoto(tipoVoto: string): TipoVoto {
  const normalized = tipoVoto.trim()
  const mapped = TIPO_VOTO_MAP[normalized]
  if (mapped) return mapped
  logger.warn('Tipo de voto não mapeado, usando AUSENTE', {
    tipoVoto: normalized,
  })
  return 'AUSENTE'
}

export function mapTipoOrientacao(orientacao: string): TipoOrientacao | null {
  const normalized = orientacao.trim()
  const mapped = TIPO_ORIENTACAO_MAP[normalized]
  if (mapped) return mapped
  logger.warn('Tipo de orientação não mapeado', { orientacao: normalized })
  return null
}

export function mapTituloToTipoParticipacao(titulo: string): TipoParticipacao {
  const lower = titulo.toLowerCase()
  if (lower === 'titular') return 'TITULAR'
  if (lower === 'suplente') return 'SUPLENTE'
  if (lower.includes('presidente')) return 'PRESIDENTE'
  return 'TITULAR'
}

export function mapDespesaToGastoCommand(
  despesa: CamaraDespesa,
  parlamentarIdExterno: string,
): GastoCreateCommand {
  return {
    parlamentarIdExterno,
    ano: despesa.ano,
    mes: despesa.mes,
    tipoDespesa: despesa.tipoDespesa,
    codDocumento: despesa.codDocumento,
    tipoDocumento: despesa.tipoDocumento,
    dataDocumento: despesa.dataDocumento || null,
    numDocumento: despesa.numDocumento,
    valorDocumento: despesa.valorDocumento,
    urlDocumento: despesa.urlDocumento || '',
    nomeFornecedor: despesa.nomeFornecedor,
    cnpjCpfFornecedor: despesa.cnpjCpfFornecedor,
    valorLiquido: despesa.valorLiquido,
    valorGlosa: despesa.valorGlosa,
    sourceUrl: `https://dadosabertos.camara.leg.br/api/v2/deputados/${parlamentarIdExterno}/despesas`,
  }
}

export function extractIdFromUri(
  uri: string | null | undefined,
): string | null {
  if (!uri) return null
  const parts = uri.split('/').filter(Boolean)
  return parts[parts.length - 1] || null
}
