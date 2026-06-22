import type { CamaraProposicaoDetalhe } from './relatorias-schema'

// Funções puras (sem rede/banco) — testáveis isoladamente.

// Extrai o id do deputado de uma URL `…/deputados/{id}`. Retorna null se a URL
// for null/vazia ou não casar o padrão (fail-closed, ADR-044 D3 — não se
// adivinha relator).
export function extrairRelatorSourceId(
  uri: string | null | undefined,
): string | null {
  if (!uri) return null
  const m = uri.match(/\/deputados\/(\d+)(?:\b|$)/)
  return m?.[1] ?? null
}

export function mapRelatorProposicao(input: CamaraProposicaoDetalhe): {
  relatorSourceId: string | null
} {
  const uri = input.dados.statusProposicao?.uriUltimoRelator ?? null
  return { relatorSourceId: extrairRelatorSourceId(uri) }
}
