import { z } from 'zod'

// Boundary Zod do registro bruto de votacao_candidato_munzona_{ano}_{UF}.csv
// (TSE). Headers validados empiricamente contra os zips reais de 2014 e 2022
// (2026-07-05, princípio 13): as colunas abaixo existem em ambos; a ORDEM das
// colunas difere entre pleitos (o parsing é por header, imune a isso).
// O CSV NÃO traz CPF — o vínculo com parlamentar é transitivo via
// SQ_CANDIDATO → tse_candidatura (ponte do ADR-063).
export const tseVotacaoMunicipalRecordSchema = z
  .object({
    ANO_ELEICAO: z.string().min(1),
    // Deputado federal e senador só competem no 1º turno; filtramos NR_TURNO=1
    // no agregador (2º turno existe no arquivo para majoritárias executivas).
    NR_TURNO: z.string().min(1),
    SG_UF: z.string().min(1),
    // 2014 traz zero à esquerda ("01120"), 2022 não (1139) — normalizado no
    // mapper para forma canônica sem zeros.
    CD_MUNICIPIO: z.string().min(1),
    NM_MUNICIPIO: z.string().min(1),
    CD_CARGO: z.string().min(1),
    SQ_CANDIDATO: z.string().min(1),
    QT_VOTOS_NOMINAIS: z.string().min(1),
  })
  .passthrough()

export type TseVotacaoMunicipalRecord = z.infer<
  typeof tseVotacaoMunicipalRecordSchema
>
