// Mapeia o campo `orientacaoVoto` da API da Câmara para o enum interno
// `orientacao_bancada`. Função pura, testável sem rede/banco.

export type OrientacaoBancada = 'SIM' | 'NAO' | 'LIBERADO' | 'OBSTRUCAO'

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

const TABLE: Record<string, OrientacaoBancada> = {
  sim: 'SIM',
  s: 'SIM',
  nao: 'NAO',
  n: 'NAO',
  liberado: 'LIBERADO',
  obstrucao: 'OBSTRUCAO',
}

// Retorna null para entradas vazias, nulas ou desconhecidas. Caller decide
// se conta como skip silencioso (vazio) ou warn (desconhecido).
export function mapOrientacaoVoto(
  input: string | null | undefined,
): OrientacaoBancada | null {
  if (input == null) return null
  const trimmed = input.trim()
  if (trimmed === '') return null
  return TABLE[normalize(trimmed)] ?? null
}
