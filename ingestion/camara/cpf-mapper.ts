import { normalizeCpf } from '../shared/cpf'
import type { CamaraDeputadoDetalhe } from './deputado-detalhe-schema'

// Funções puras (sem rede/banco) — testáveis isoladamente.
// `normalizeCpf` vive em ../shared/cpf (compartilhado com a ingestão TSE).
export { normalizeCpf }

export interface CpfUpdate {
  sourceId: string
  cpf: string | null
}

export function mapDeputadoDetalheCpf(input: CamaraDeputadoDetalhe): CpfUpdate {
  return {
    sourceId: input.dados.id,
    cpf: normalizeCpf(input.dados.cpf),
  }
}
