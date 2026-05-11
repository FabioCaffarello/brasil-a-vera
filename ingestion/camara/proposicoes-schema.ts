import { z } from 'zod'

// Schemas para os endpoints de proposições da Câmara dos Deputados.

// Item da listagem GET /proposicoes
// Nota: `ementa` pode vir vazia em alguns tipos (REQ, INC) ou em proposições
// recém-protocoladas. Aceitamos e deixamos o banco persistir string vazia.
export const camaraProposicaoListagemSchema = z
  .object({
    id: z.number().int(),
    uri: z.string().url(),
    siglaTipo: z.string().min(1),
    numero: z.number().int(),
    ano: z.number().int(),
    ementa: z.string(),
  })
  .passthrough()

export type CamaraProposicaoListagem = z.infer<
  typeof camaraProposicaoListagemSchema
>

// Detalhe GET /proposicoes/{id} — situação e regime vivem em `statusProposicao`.
export const camaraProposicaoDetalheSchema = z
  .object({
    id: z.number().int(),
    siglaTipo: z.string().min(1),
    numero: z.number().int(),
    ano: z.number().int(),
    ementa: z.string(),
    ementaDetalhada: z.string().nullable().optional(),
    statusProposicao: z
      .object({
        descricaoSituacao: z.string().nullable().optional(),
        regime: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
  })
  .passthrough()

export type CamaraProposicaoDetalhe = z.infer<
  typeof camaraProposicaoDetalheSchema
>

// Item de GET /proposicoes/{id}/temas
// API real (verificada empiricamente): retorna `tema` (não `nome`) como campo
// textual. `relevancia` também é retornado mas não usamos.
export const camaraTemaSchema = z
  .object({
    codTema: z.number().int(),
    tema: z.string().min(1),
  })
  .passthrough()

export type CamaraTema = z.infer<typeof camaraTemaSchema>

// Item de GET /proposicoes/{id}/autores
export const camaraAutorSchema = z
  .object({
    nome: z.string().min(1),
    tipo: z.string().nullable().optional(),
    uri: z.string().url().nullable().optional(),
    // `proponente` em 1 indica o autor principal (signatário primeiro); demais
    // são coautores ou apoiadores de assinatura.
    proponente: z
      .union([z.literal(0), z.literal(1)])
      .nullable()
      .optional(),
  })
  .passthrough()

export type CamaraAutor = z.infer<typeof camaraAutorSchema>
