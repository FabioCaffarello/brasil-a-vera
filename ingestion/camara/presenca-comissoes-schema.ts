import { z } from 'zod'

// Extends camaraEventoSchema (sessoes-schema.ts) com orgaos — campo presente
// tanto na listagem /eventos quanto no detalhe /eventos/{id} (probe 2026-06-30).

export const camaraOrgaoResumoSchema = z
  .object({
    id: z.number(),
    sigla: z.string().optional(),
    nome: z.string().optional(),
  })
  .passthrough()

export const camaraEventoComissaoSchema = z
  .object({
    id: z.union([z.string(), z.number()]).transform(String),
    uri: z.string(),
    dataHoraInicio: z.string(),
    descricaoTipo: z.string(),
    situacao: z.string().nullable().optional(),
    orgaos: z.array(camaraOrgaoResumoSchema).optional().default([]),
  })
  .passthrough()

export type CamaraEventoComissao = z.infer<typeof camaraEventoComissaoSchema>

// Tipos de evento que contam como reunião deliberativa de comissão (ADR-061).
// "Sessão Deliberativa" (plenário) fica de fora — já ingerida em presenca_sessao.
export const TIPOS_DELIBERATIVOS_COMISSAO = new Set([
  'Reunião Deliberativa',
  'Audiência Pública e Deliberação',
])

export function isReuniaoDeLiberativaEncerrada(ev: {
  descricaoTipo: string
  situacao?: string | null
}): boolean {
  return (
    TIPOS_DELIBERATIVOS_COMISSAO.has(ev.descricaoTipo) &&
    (ev.situacao ?? '').trim().toLowerCase().startsWith('encerrada')
  )
}
