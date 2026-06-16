import { z } from 'zod'

// Boundary Zod do registro bruto de bem_candidato_AAAA_BRASIL.csv (TSE).
// Todos os campos chegam como string (vêm do parser CSV). O schema só afirma
// presença das colunas que usamos; o mapper converte para tipos do banco.
// Colunas reais confirmadas na inspeção do CSV 2022 (princípio 13).
export const tseBemRecordSchema = z
  .object({
    ANO_ELEICAO: z.string().min(1),
    SQ_CANDIDATO: z.string().min(1),
    NR_ORDEM_BEM_CANDIDATO: z.string().min(1),
    CD_TIPO_BEM_CANDIDATO: z.string().min(1),
    DS_TIPO_BEM_CANDIDATO: z.string(),
    DS_BEM_CANDIDATO: z.string(),
    VR_BEM_CANDIDATO: z.string().min(1),
    DT_ULT_ATUAL_BEM_CANDIDATO: z.string().optional(),
  })
  .passthrough()

export type TseBemRecord = z.infer<typeof tseBemRecordSchema>
