import type { CamaraFrente, CamaraFrenteMembro } from './frentes-schema'

export interface FrenteParlamentarRow {
  sourceId: string
  nome: string
  legislatura: number
}

export interface FrenteMembroRow {
  frenteSourceId: string
  parlamentarId: string
  titulo: string | null
}

// Monta a row de cabeçalho da frente.
export function mapFrenteCamara(frente: CamaraFrente): FrenteParlamentarRow {
  return {
    sourceId: String(frente.id),
    nome: frente.titulo,
    // idLegislatura pode não estar presente em todos os itens da lista;
    // usa 57 (LEGISLATURA_ATUAL) como fallback seguro.
    legislatura: frente.idLegislatura ?? 57,
  }
}

// Monta a row de membro. Retorna null se o deputado não está na nossa base.
export function mapFrenteMembroCamara(
  membro: CamaraFrenteMembro,
  frenteSourceId: string,
  parlamentarPorSourceId: Map<string, string>,
): FrenteMembroRow | null {
  const parlamentarId = parlamentarPorSourceId.get(String(membro.id))
  if (!parlamentarId) return null
  return {
    frenteSourceId,
    parlamentarId,
    titulo: membro.titulo?.trim() || null,
  }
}
