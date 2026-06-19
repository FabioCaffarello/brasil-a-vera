import { z } from 'zod'

// Schemas para a ingestão de membros de comissão do Senado.
//
// Duas chamadas:
//   1. GET /senador/{id}/comissoes — todas as participações do senador em
//      colegiados: comissões (SF e mistas CN), MAS TAMBÉM grupos parlamentares
//      (GP*) e frentes parlamentares (FP*), que NÃO são comissões. O item não
//      traz o tipo do colegiado — só o código; o tipo vem da chamada 2.
//   2. GET /comissao/{codigo} — detalhe do colegiado, com
//      `TipoColegiado.CodigoTipo` (discriminador determinístico: 129=Grupo
//      Parlamentar, 130=Frente Parlamentar são excluídos; ver mapper).
//
// As respostas do Senado são XML-convertido-em-JSON: um elemento que pode
// repetir vem como objeto único quando há um só, e como array quando há vários.
// `oneOrMany` normaliza para array.

const oneOrMany = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .union([z.array(schema), schema])
    .transform((v) => (Array.isArray(v) ? v : [v]))

// ── 1. /senador/{id}/comissoes ────────────────────────────────────────────
const identificacaoComissaoSchema = z.object({
  CodigoComissao: z.union([z.string(), z.number()]).transform(String),
  SiglaComissao: z.string().min(1),
  NomeComissao: z.string().min(1),
  SiglaCasaComissao: z.string().nullable().optional(),
})

export const senadoComissaoParticipacaoSchema = z.object({
  IdentificacaoComissao: identificacaoComissaoSchema,
  DescricaoParticipacao: z.string().nullable().optional(),
  DataInicio: z.string().nullable().optional(),
  DataFim: z.string().nullable().optional(),
})

export type SenadoComissaoParticipacao = z.infer<
  typeof senadoComissaoParticipacaoSchema
>

// Envelope completo. `MembroComissoes` pode vir ausente/string vazia quando o
// senador não tem participações — tratado como lista vazia no orchestrator.
export const senadoComissoesEnvelopeSchema = z.object({
  MembroComissaoParlamentar: z.object({
    Parlamentar: z.object({
      Codigo: z.union([z.string(), z.number()]).transform(String).optional(),
      MembroComissoes: z
        .object({
          Comissao: oneOrMany(senadoComissaoParticipacaoSchema).optional(),
        })
        .nullable()
        .optional(),
    }),
  }),
})

// ── 2. /comissao/{codigo} ─────────────────────────────────────────────────
const tipoColegiadoSchema = z.object({
  TipoColegiado: z.string().nullable().optional(),
  CodigoTipo: z.union([z.string(), z.number()]).transform(Number),
  SiglaCasa: z.string().nullable().optional(),
})

const colegiadoSchema = z.object({
  TipoColegiado: tipoColegiadoSchema.nullable().optional(),
})

export const senadoColegiadoDetalheSchema = z.object({
  ComissoesCongressoNacional: z.object({
    Colegiados: z
      .object({
        Colegiado: oneOrMany(colegiadoSchema).optional(),
      })
      .nullable()
      .optional(),
  }),
})

export type SenadoColegiadoDetalhe = z.infer<
  typeof senadoColegiadoDetalheSchema
>
