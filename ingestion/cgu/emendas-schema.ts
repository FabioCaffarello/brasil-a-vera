import { z } from 'zod'

// Boundary Zod do registro bruto de EmendasParlamentares.csv (Portal da
// Transparência / CGU — ADR-066). Headers validados empiricamente contra o
// zip real em 2026-07-14 (princípio 13; output literal no ADR-066 e em
// docs/audits/2026-07-probe-download-de-dados.md §A.3).
//
// Colunas de valor podem vir vazias em linhas antigas → z.string() sem min.
// A coluna "UF" traz o NOME do estado por extenso ("BAHIA"); a sigla é
// derivada do "Código UF IBGE" (2 primeiros dígitos) no mapper.
export const cguEmendaRecordSchema = z
  .object({
    'Código da Emenda': z.string().min(1),
    'Ano da Emenda': z.string().min(1),
    'Tipo de Emenda': z.string().min(1),
    'Código do Autor da Emenda': z.string(),
    'Nome do Autor da Emenda': z.string(),
    'Localidade de aplicação do recurso': z.string(),
    'Código Município IBGE': z.string(),
    Município: z.string(),
    'Código UF IBGE': z.string(),
    'Valor Empenhado': z.string(),
    'Valor Liquidado': z.string(),
    'Valor Pago': z.string(),
    'Valor Restos A Pagar Inscritos': z.string(),
    'Valor Restos A Pagar Pagos': z.string(),
  })
  .passthrough()

export type CguEmendaRecord = z.infer<typeof cguEmendaRecordSchema>
