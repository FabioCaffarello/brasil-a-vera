import type { CamaraLider } from './liderancas-schema'

// Tipo normalizado — texto (não enum SQL) para permitir extensões sem migration.
export type TipoLideranca =
  | 'LIDER_PARTIDO'
  | 'VICE_LIDER_PARTIDO'
  | 'LIDER_GOVERNO'
  | 'LIDER_OPOSICAO'
  | 'LIDER_MINORIA'
  | 'LIDER_MAIORIA'
  | 'LIDER_BLOCO'

export interface LiderancaCargoRow {
  parlamentarId: string
  tipo: string
  entidade: string
  casa: 'CAMARA' | 'SENADO'
  legislatura: number
  dataInicio: string | null
  dataFim: string | null
}

// Normaliza o `titulo` da Câmara → tipo interno.
// "Líder" (e variantes maiúsculas/sem acento) → LIDER_PARTIDO.
// "Vice-Líder" / "1º Vice-Líder" → VICE_LIDER_PARTIDO.
// Desconhecido → LIDER_PARTIDO por default.
export function normalizarTituloCamara(
  titulo: string | null | undefined,
): TipoLideranca {
  const t = (titulo ?? '').trim().toLowerCase()
  if (t.includes('vice')) return 'VICE_LIDER_PARTIDO'
  return 'LIDER_PARTIDO'
}

// Monta a row a partir do item de /partidos/{id}/lideres + sigla do partido.
// Retorna null quando não resolve o parlamentarId (fora da nossa base).
export function mapLiderCamara(
  lider: CamaraLider,
  siglaPartido: string,
  legislatura: number,
  parlamentarPorSourceId: Map<string, string>,
): LiderancaCargoRow | null {
  const parlamentarId = parlamentarPorSourceId.get(String(lider.id))
  if (!parlamentarId) return null

  return {
    parlamentarId,
    tipo: normalizarTituloCamara(lider.titulo),
    entidade: siglaPartido,
    casa: 'CAMARA',
    legislatura,
    dataInicio: null,
    dataFim: null,
  }
}
