import { z } from 'zod'

// Schemas para a nova API do Senado (`/processo`), substituta de
// `/materia/movimentacoes` depreciado em 2026-02-01.

// Item da listagem GET /processo?codigoMateria=X — devolve um array.
// Usamos para extrair `id` (idProcesso), que é a chave do endpoint detalhado
// `/processo/{idProcesso}`. Outros campos passam por passthrough porque a
// ingestão de proposições principal (em senado/proposicoes.ts) usa essa
// listagem; aqui só nos interessa o id.
export const senadoProcessoListItemSchema = z
  .object({
    id: z.number().int(),
    codigoMateria: z.number().int(),
  })
  .passthrough()

export type SenadoProcessoListItem = z.infer<
  typeof senadoProcessoListItemSchema
>

// Estrutura do detalhe GET /processo/{idProcesso}. Tramitação fica nested em
// `autuacoes[].informesLegislativos[]`. Uma proposição pode ter múltiplas
// autuações (raro em PFs/MPVs; comum em propostas que receberam apensados).
const senadoInformeSchema = z
  .object({
    id: z.number().int(),
    data: z.string().min(1),
    descricao: z.string().min(1),
    colegiado: z
      .object({
        sigla: z.string().nullable().optional(),
        nome: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    enteAdministrativo: z
      .object({
        sigla: z.string().nullable().optional(),
        nome: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough()

export type SenadoInforme = z.infer<typeof senadoInformeSchema>

const senadoAutuacaoSchema = z
  .object({
    informesLegislativos: z.array(senadoInformeSchema).default([]),
    // Resto da estrutura ignorada — só precisamos dos informes.
  })
  .passthrough()

export const senadoProcessoDetalheSchema = z
  .object({
    id: z.number().int(),
    autuacoes: z.array(senadoAutuacaoSchema).default([]),
  })
  .passthrough()

export type SenadoProcessoDetalhe = z.infer<typeof senadoProcessoDetalheSchema>
