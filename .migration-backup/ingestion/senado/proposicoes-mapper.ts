// Funções puras para mapear proposições do Senado para os tipos internos.

export type TipoProposicao = 'PL' | 'PEC' | 'PLP' | 'MPV' | 'PDC' | 'PRC'

export type SituacaoProposicao =
  | 'TRAMITANDO'
  | 'APROVADA'
  | 'REJEITADA'
  | 'ARQUIVADA'
  | 'TRANSFORMADA_EM_NORMA'

// O Senado usa siglas próprias (PLS, PDL, PRS) que mapeamos para o enum
// interno baseado na Câmara. PLS (Projeto de Lei do Senado) foi unificado
// em "PL" desde 2019, mas o histórico ainda tem PLS — tratamos como PL.
const SIGLA_TABLE: Record<string, TipoProposicao> = {
  PL: 'PL',
  PLS: 'PL',
  PEC: 'PEC',
  PLP: 'PLP',
  PLC: 'PLP', // Projeto de Lei da Câmara (originário) — equivalência funcional
  MPV: 'MPV',
  PDL: 'PDC', // Projeto de Decreto Legislativo
  PDS: 'PDC', // Projeto de Decreto Legislativo do Senado (legacy)
  PRS: 'PRC', // Projeto de Resolução do Senado
}

export function mapSiglaSenado(sigla: string): TipoProposicao | null {
  return SIGLA_TABLE[sigla.trim().toUpperCase()] ?? null
}

// Identificação vem como "PL 1234/2025" tipicamente, mas tem várias
// variações no histórico do Senado:
//   "MPV 2189-49/2001"           — MP reeditada (sufixo é nº de reedição)
//   "PL 1234A/2025"               — sufixo alfabético (avulso/substitutivo)
//   "PL 6547/2019 (Substitutivo-CD)" — anotação extra após o ano
//   "REQ 54/2019 - CRE"           — anotação extra após o ano
//   "R.S 1/2019"                  — sigla com ponto
// Estratégia: sigla pode conter pontos; tudo entre o número e "/" é
// descartado; tudo depois do ano também. Captura só sigla, número base e ano.
export function parseIdentificacao(
  text: string,
): { sigla: string; numero: number; ano: number } | null {
  const match = text.trim().match(/^([A-Z.]+)\s+(\d+)[^/]*\/(\d{4})/i)
  if (!match) return null
  return {
    sigla: match[1].toUpperCase(),
    numero: Number(match[2]),
    ano: Number(match[3]),
  }
}

// Sem detalhe de status no endpoint /processo simples, usamos apenas o flag
// `tramitando`. Refinar com endpoint de tramitação em PR posterior.
export function mapSituacaoFromTramitando(
  tramitando: string,
): SituacaoProposicao {
  return tramitando.trim().toLowerCase() === 'sim' ? 'TRAMITANDO' : 'ARQUIVADA'
}
