import type { CamaraFuncionarioRecord } from './comissionados-schema'

// Mapper dos comissionados de gabinete da Câmara (ADR-064 E2). Puro.
//
// O CSV cobre TODO o quadro de pessoal da Câmara; o recorte do produto é o
// pessoal lotado em GABINETE DE DEPUTADO — identificado de forma
// determinística pela coluna uriLotacao (referência à API v2). Secretários
// parlamentares E CNEs lotados em gabinete entram; efetivos/CNEs de
// liderança e órgãos administrativos (uriLotacao vazia) ficam fora.

const URI_DEPUTADO_RE =
  /^https?:\/\/dadosabertos\.camara\.leg\.br\/api\/v2\/deputados\/(\d+)\s*$/

/**
 * Extrai o sourceId do deputado dono do gabinete a partir de uriLotacao.
 * null = lotação que não é gabinete de deputado (fora do recorte).
 */
export function extrairDeputadoSourceId(uriLotacao: string): string | null {
  const match = uriLotacao.trim().match(URI_DEPUTADO_RE)
  return match ? match[1] : null
}

export interface ComissionadoCamaraRow {
  deputadoSourceId: string
  nome: string
  grupo: string
  cargo: string | null
  ponto: string | null
}

/**
 * Mapeia um record do CSV; null quando a lotação não é gabinete de deputado.
 */
export function mapFuncionarioCamara(
  record: CamaraFuncionarioRecord,
): ComissionadoCamaraRow | null {
  const deputadoSourceId = extrairDeputadoSourceId(record.uriLotacao)
  if (deputadoSourceId === null) return null

  const cargo = record.cargo.trim()
  const ponto = record.ponto.trim()
  return {
    deputadoSourceId,
    nome: record.nome.trim(),
    grupo: record.grupo.trim(),
    cargo: cargo === '' ? null : cargo,
    ponto: ponto === '' ? null : ponto,
  }
}
