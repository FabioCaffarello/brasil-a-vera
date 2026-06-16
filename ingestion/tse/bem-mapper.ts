import type { TseBemRecord } from './bem-schema'

// Linha pronta para INSERT em `eleitoral.tse_bem_candidato`. Tipos explícitos
// (não inferidos do Drizzle) para manter a função pura e testável.
export interface BemCandidatoRow {
  anoEleicao: number
  sqCandidato: number
  nrOrdemBem: number
  cdTipoBem: number
  dsTipoBem: string
  dsBem: string
  valorDeclarado: string
  dtUltAtualizacao: string | null
  trustLevel: 'L1'
  sourceUrl: string
}

// "9645,00" / "1.083.531.773,61" → "9645.00" / "1083531773.61".
// O TSE 2022 não usa separador de milhar, mas removemos pontos de milhar
// defensivamente antes de trocar a vírgula decimal por ponto. O resultado
// alimenta numeric(15,2) com mode 'string' (sem float, preserva precisão).
export function parseValorBrl(raw: string): string {
  return raw.trim().replace(/\./g, '').replace(',', '.')
}

// "14/12/2022" → "2022-12-14". Vazio/inválido → null.
export function parseDataBr(raw: string | undefined): string | null {
  if (!raw) return null
  const m = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!m) return null
  return `${m[3]}-${m[2]}-${m[1]}`
}

export function mapTseBem(
  input: TseBemRecord,
  sourceUrl: string,
): BemCandidatoRow {
  return {
    anoEleicao: Number(input.ANO_ELEICAO),
    sqCandidato: Number(input.SQ_CANDIDATO),
    nrOrdemBem: Number(input.NR_ORDEM_BEM_CANDIDATO),
    cdTipoBem: Number(input.CD_TIPO_BEM_CANDIDATO),
    dsTipoBem: input.DS_TIPO_BEM_CANDIDATO,
    dsBem: input.DS_BEM_CANDIDATO,
    valorDeclarado: parseValorBrl(input.VR_BEM_CANDIDATO),
    dtUltAtualizacao: parseDataBr(input.DT_ULT_ATUAL_BEM_CANDIDATO),
    trustLevel: 'L1',
    sourceUrl,
  }
}
