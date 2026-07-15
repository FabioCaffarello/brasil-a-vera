import type { InferInsertModel } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import type { votoCandidatoMunicipio } from '@/modules/eleitoral/domain/schema'

export type VotoMunicipioInsert = InferInsertModel<
  typeof votoCandidatoMunicipio
>

let codigoCounter = 90000

export function buildVotoMunicipio(
  args: { sqCandidato: number } & Partial<VotoMunicipioInsert>,
): VotoMunicipioInsert {
  const codigo = String(codigoCounter++)
  return {
    id: uuidv7(),
    anoEleicao: 2022,
    municipioTseCodigo: codigo,
    municipioNome: 'BELO HORIZONTE',
    uf: 'MG',
    qtVotosNominais: 1000,
    trustLevel: 'L1',
    sourceUrl:
      'https://cdn.tse.jus.br/estatistica/sead/odsele/votacao_candidato_munzona/votacao_candidato_munzona_2022.zip',
    ...args,
  }
}
