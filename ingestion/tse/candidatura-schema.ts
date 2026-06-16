import { z } from 'zod'

// Boundary Zod do registro bruto de consulta_cand_AAAA_BRASIL.csv (TSE).
// Necessário porque o arquivo de bens NÃO traz CPF — só SQ_CANDIDATO. O CPF
// (NR_CPF_CANDIDATO) vive aqui, e é a única chave determinística para a ponte
// candidatura→parlamentar do Eixo 2.
export const tseCandidaturaRecordSchema = z
  .object({
    ANO_ELEICAO: z.string().min(1),
    SQ_CANDIDATO: z.string().min(1),
    NR_CPF_CANDIDATO: z.string().optional(),
    CD_CARGO: z.string().min(1),
    DS_CARGO: z.string(),
    NM_CANDIDATO: z.string(),
    SG_UF: z.string(),
    SG_UE: z.string(),
    DS_SITUACAO_CANDIDATURA: z.string(),
  })
  .passthrough()

export type TseCandidaturaRecord = z.infer<typeof tseCandidaturaRecordSchema>
