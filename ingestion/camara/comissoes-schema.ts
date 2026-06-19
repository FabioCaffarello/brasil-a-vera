import { z } from 'zod'

// Schemas para a ingestão de membros de comissão da Câmara.
//
// Duas chamadas por deputado-derivada:
//   1. GET /deputados/{id}/orgaos — lista os órgãos do deputado (comissões,
//      grupos de trabalho, conselhos, mesa…). O item NÃO traz o tipo do órgão,
//      só o id; o tipo vem da chamada 2.
//   2. GET /orgaos/{id} — detalhe do órgão, com `codTipoOrgao` (o discriminador
//      determinístico comissão-vs-outros; ver comissoes-mapper.ts).

// Item de /deputados/{id}/orgaos. `dataInicio`/`dataFim` vêm como datetime ISO
// ("2026-03-03T00:00"); o mapper trunca para date.
export const camaraDeputadoOrgaoSchema = z.object({
  idOrgao: z.number().int(),
  siglaOrgao: z.string().nullable(),
  nomeOrgao: z.string().min(1),
  // Papel: "Titular", "Suplente", "Presidente", "1º Vice-Presidente"…
  titulo: z.string().nullable(),
  codTitulo: z.string().nullable(),
  dataInicio: z.string().min(1),
  dataFim: z.string().nullable(),
})

export type CamaraDeputadoOrgao = z.infer<typeof camaraDeputadoOrgaoSchema>

// Detalhe de /orgaos/{id} — só extraímos o que classifica o órgão. A API
// envelopa em `{ dados: {...} }`; o consumer desembrulha antes do parse.
export const camaraOrgaoDetalheSchema = z.object({
  id: z.number().int(),
  sigla: z.string().nullable(),
  nome: z.string().min(1),
  codTipoOrgao: z.number().int(),
  tipoOrgao: z.string().nullable(),
})

export type CamaraOrgaoDetalhe = z.infer<typeof camaraOrgaoDetalheSchema>
