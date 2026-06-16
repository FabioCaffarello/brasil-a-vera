import { normalizeCpf } from '../shared/cpf'
import type { TseCandidaturaRecord } from './candidatura-schema'

// Linha pronta para INSERT em `eleitoral.tse_candidatura` (sem parlamentar_id,
// que é resolvido depois por CPF exato no entrypoint). Tipos explícitos para
// manter a função pura e testável.
export interface CandidaturaRow {
  anoEleicao: number
  sqCandidato: number
  cpf: string | null
  cdCargo: number
  dsCargo: string
  nmCandidato: string
  sgUf: string
  sgUe: string
  dsSituacaoCandidatura: string
  trustLevel: 'L1'
  sourceUrl: string
}

export function mapTseCandidatura(
  input: TseCandidaturaRecord,
  sourceUrl: string,
): CandidaturaRow {
  return {
    anoEleicao: Number(input.ANO_ELEICAO),
    sqCandidato: Number(input.SQ_CANDIDATO),
    // Sentinela do TSE ("-1"/"-4") ou inválido → null (não-vinculável).
    cpf: normalizeCpf(input.NR_CPF_CANDIDATO),
    cdCargo: Number(input.CD_CARGO),
    dsCargo: input.DS_CARGO,
    nmCandidato: input.NM_CANDIDATO,
    sgUf: input.SG_UF,
    sgUe: input.SG_UE,
    dsSituacaoCandidatura: input.DS_SITUACAO_CANDIDATURA,
    trustLevel: 'L1',
    sourceUrl,
  }
}
