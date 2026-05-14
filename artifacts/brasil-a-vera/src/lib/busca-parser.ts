// Heurísticas para interpretar a string da busca.
// Pure, testável sem ambiente Next/DB.

const TIPOS_PROPOSICAO = ['PL', 'PEC', 'PLP', 'MPV', 'PDC', 'PRC'] as const

export interface ProposicaoRef {
  tipo: (typeof TIPOS_PROPOSICAO)[number]
  numero: number
  ano: number
}

// Detecta a forma canônica "PL 1234/2025" (ou "pl 1234/25" etc) na entrada.
// Retorna a referência se encontrar — pode ser usada para link direto à
// página da proposição sem precisar fazer LIKE na ementa.
export function parseProposicaoRef(query: string): ProposicaoRef | null {
  const cleaned = query.trim().toUpperCase()
  // Aceita 1-4 dígitos no ano (ex: "25" → 2025 ou só ignora?). Por simplicidade
  // aceitamos só 4 dígitos canônicos.
  const match = cleaned.match(/^([A-Z]+)\s+(\d+)\s*\/\s*(\d{4})$/)
  if (!match) return null
  const tipo = match[1] as (typeof TIPOS_PROPOSICAO)[number]
  if (!TIPOS_PROPOSICAO.includes(tipo)) return null
  return {
    tipo,
    numero: Number(match[2]),
    ano: Number(match[3]),
  }
}

// Termo "limpo" para busca SQL com ILIKE — escapa wildcards e enquadra com %%.
// Caracteres `%` e `_` da entrada do usuário são tratados como literais.
export function escapeIlike(input: string): string {
  return `%${input.replace(/[\\%_]/g, '\\$&')}%`
}
