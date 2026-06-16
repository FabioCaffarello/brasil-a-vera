import type { InferInsertModel } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import type {
  tseBemCandidato,
  tseCandidatura,
} from '@/modules/eleitoral/domain/schema'

export type TseCandidaturaInsert = InferInsertModel<typeof tseCandidatura>
export type TseBemInsert = InferInsertModel<typeof tseBemCandidato>

let seqCounter = 110000000000

// Candidatura federal 2022. Por padrão SEM vínculo (parlamentarId null);
// passe `parlamentarId` no override para simular o vínculo por CPF (L2).
export function buildTseCandidatura(
  overrides: Partial<TseCandidaturaInsert> = {},
): TseCandidaturaInsert {
  const sq = seqCounter++
  return {
    id: uuidv7(),
    anoEleicao: 2022,
    sqCandidato: sq,
    cpf: '00000000000',
    cdCargo: 6,
    dsCargo: 'DEPUTADO FEDERAL',
    nmCandidato: 'FULANO DE TAL',
    sgUf: 'SP',
    sgUe: 'SP',
    dsSituacaoCandidatura: 'APTO',
    parlamentarId: null,
    trustLevel: 'L1',
    sourceUrl: 'https://cdn.tse.jus.br/.../consulta_cand_2022.zip',
    ...overrides,
  }
}

let ordemCounter = 1

// Bem declarado. Liga-se à candidatura por (anoEleicao, sqCandidato) — sem FK
// física, então passe o mesmo `sqCandidato` da candidatura no override.
export function buildTseBem(
  overrides: Partial<TseBemInsert> = {},
): TseBemInsert {
  return {
    id: uuidv7(),
    anoEleicao: 2022,
    sqCandidato: seqCounter,
    nrOrdemBem: ordemCounter++,
    cdTipoBem: 12,
    dsTipoBem: 'Casa',
    dsBem: 'Imóvel residencial',
    valorDeclarado: '100000.00',
    dtUltAtualizacao: '2022-12-14',
    trustLevel: 'L1',
    sourceUrl: 'https://cdn.tse.jus.br/.../bem_candidato_2022.zip',
    ...overrides,
  }
}
