import { LEGISLATURA_ATUAL } from '@/shared/legislatura'
import type { SenadoBlocoItem } from './blocos-schema'

export interface BlocoPartidarioRow {
  sourceId: string
  nome: string
  casa: 'CAMARA' | 'SENADO'
  legislatura: number
  partidos: string[]
}

// Monta a row a partir de um item do /dados/ListaBlocoParlamentar.json.
// Os partidos são extraídos de Membros.Membro[].Partido.SiglaPartido.
export function mapBlocoSenado(bloco: SenadoBlocoItem): BlocoPartidarioRow {
  const membros = bloco.Membros?.Membro ?? []
  const partidos = membros
    .map((m) => m.Partido.SiglaPartido.trim().toUpperCase())
    .filter(Boolean)

  return {
    sourceId: bloco.CodigoBloco,
    nome: bloco.NomeApelido?.trim() || bloco.NomeBloco,
    casa: 'SENADO',
    legislatura: LEGISLATURA_ATUAL,
    partidos,
  }
}
