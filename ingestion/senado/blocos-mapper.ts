import { LEGISLATURA_ATUAL } from '@/shared/legislatura'
import type { SenadoBlocoDetalhe } from './blocos-schema'

export interface BlocoPartidarioRow {
  sourceId: string
  nome: string
  casa: 'CAMARA' | 'SENADO'
  legislatura: number
  partidos: string[]
}

// Monta a row a partir do detalhe de /composicao/bloco/{codigo}.
export function mapBlocoSenado(
  detalhe: SenadoBlocoDetalhe,
): BlocoPartidarioRow {
  const d = detalhe.DetalhesBloco
  const partidos = (d.Partidos?.Partido ?? [])
    .map((p) => p.SiglaPartido.trim().toUpperCase())
    .filter(Boolean)

  return {
    sourceId: d.Codigo,
    nome: d.NomeApelido?.trim() || d.Nome,
    casa: 'SENADO',
    legislatura: LEGISLATURA_ATUAL,
    partidos,
  }
}
