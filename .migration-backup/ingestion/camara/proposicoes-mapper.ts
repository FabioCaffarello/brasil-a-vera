// Funções puras de mapeamento dos payloads da Câmara para os tipos internos.

export type TipoProposicao = 'PL' | 'PEC' | 'PLP' | 'MPV' | 'PDC' | 'PRC'

export type SituacaoProposicao =
  | 'TRAMITANDO'
  | 'APROVADA'
  | 'REJEITADA'
  | 'ARQUIVADA'
  | 'TRANSFORMADA_EM_NORMA'

export type TipoAutoria = 'AUTOR' | 'COAUTOR'

const TIPOS_PROPOSICAO: ReadonlySet<TipoProposicao> = new Set([
  'PL',
  'PEC',
  'PLP',
  'MPV',
  'PDC',
  'PRC',
])

// Mapeia siglaTipo da Câmara para o enum interno. Retorna null se a sigla
// não corresponder a um tipo coberto na Wave 0 (a Câmara tem dezenas de
// tipos — REQ, INC, IND, EMP etc — fora do escopo atual).
export function mapTipoSigla(sigla: string): TipoProposicao | null {
  const normalized = sigla.trim().toUpperCase()
  return TIPOS_PROPOSICAO.has(normalized as TipoProposicao)
    ? (normalized as TipoProposicao)
    : null
}

// A `descricaoSituacao` da Câmara é texto livre — varia bastante. Usamos
// heurística por substring (case-insensitive). Ordem importa: situações mais
// específicas vêm antes ("Transformada em Norma" antes de "Arquivada").
export function mapSituacao(
  descricao: string | null | undefined,
): SituacaoProposicao {
  if (!descricao) return 'TRAMITANDO'
  const s = descricao.toLowerCase()
  if (s.includes('transformad') && (s.includes('norma') || s.includes('lei'))) {
    return 'TRANSFORMADA_EM_NORMA'
  }
  if (s.includes('rejeit')) return 'REJEITADA'
  if (s.includes('arquivad')) return 'ARQUIVADA'
  if (s.includes('aprovad')) return 'APROVADA'
  return 'TRAMITANDO'
}

// `proponente === 1` indica autor primário; 0 ou ausente indica coautor/
// apoiador adicional.
export function mapTipoAutoria(
  proponente: 0 | 1 | null | undefined,
): TipoAutoria {
  return proponente === 1 ? 'AUTOR' : 'COAUTOR'
}

// Extrai o id numérico do deputado da URI `https://.../deputados/{id}`. Retorna
// null para autores não-deputados (Senado, Comissões, Mesa, etc).
export function extractDeputadoIdFromUri(
  uri: string | null | undefined,
): string | null {
  if (!uri) return null
  const match = uri.match(/\/deputados\/(\d+)(?:[/?]|$)/)
  return match ? match[1] : null
}
