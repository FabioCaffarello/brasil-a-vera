import { LEGISLATURA_ATUAL } from '@/shared/legislatura'
import type { CamaraBlocoDetalhe } from './blocos-schema'

export interface BlocoPartidarioRow {
  sourceId: string
  nome: string
  casa: 'CAMARA' | 'SENADO'
  legislatura: number
  partidos: string[]
}

// Monta a row a partir do detalhe de /blocos/{id}.
// `partidos` é extraído do array `detalhe.partidos` quando presente;
// se ausente (API inesperada), registra array vazio — não falha.
export function mapBlocoCamara(
  detalhe: CamaraBlocoDetalhe,
): BlocoPartidarioRow {
  const partidos = (detalhe.partidos ?? [])
    .map((p) => p.sigla.trim().toUpperCase())
    .filter(Boolean)

  return {
    sourceId: String(detalhe.id),
    nome: detalhe.nome,
    casa: 'CAMARA',
    legislatura: detalhe.idLegislatura ?? LEGISLATURA_ATUAL,
    partidos,
  }
}
