import {
  getParlamentaresEmExercicioPorUf,
  type ParlamentarUfRow,
} from './parlamentares-por-uf'

// Porta de entrada "Quem me representa": os parlamentares federais em exercício
// de uma UF (3 senadores + deputados). Reusa a lista-base cacheada por UF
// (parlamentares-por-uf) e apenas separa por casa em memória. O card reusa a
// mesma barra de alinhamento da listagem. Cache de edge na fonte (ADR-018).

export type RepresentanteCard = ParlamentarUfRow

export interface Representantes {
  senadores: RepresentanteCard[]
  deputados: RepresentanteCard[]
}

export async function getRepresentantesPorUf(
  uf: string,
): Promise<Representantes> {
  const rows = await getParlamentaresEmExercicioPorUf(uf)
  return {
    senadores: rows.filter((r) => r.casa === 'SENADO'),
    deputados: rows.filter((r) => r.casa === 'CAMARA'),
  }
}
