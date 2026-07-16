import { z } from 'zod'

// Boundary Zod do record de funcionarios.csv (Dados Abertos da Câmara —
// ADR-064 E2). Headers verificados empiricamente contra o CSV real em
// 2026-07-14 (probe Fase C, docs/audits/2026-07-probe-download-de-dados.md):
// "ponto";"codGrupo";"grupo";"nome";"cargo";"lotacao";"atoNomeacao";
// "dataNomeacao";"dataInicioHistorico";"dataPubNomeacao";"funcao";"uriLotacao"
//
// ⚠️ O arquivo é UTF-8 COM BOM — o strip acontece no main antes do parse
// (o parser CSV trataria o BOM como conteúdo da primeira chave).
export const camaraFuncionarioRecordSchema = z
  .object({
    ponto: z.string(),
    grupo: z.string().min(1),
    nome: z.string().min(1),
    cargo: z.string(),
    lotacao: z.string(),
    // Presente só quando a lotação é gabinete de deputado:
    // https://dadosabertos.camara.leg.br/api/v2/deputados/{id}
    uriLotacao: z.string(),
  })
  .passthrough()

export type CamaraFuncionarioRecord = z.infer<
  typeof camaraFuncionarioRecordSchema
>
