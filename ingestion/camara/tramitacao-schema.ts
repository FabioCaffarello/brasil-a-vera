import { z } from 'zod'

// Schema do endpoint GET /proposicoes/{id}/tramitacoes da Câmara.
// Verificado empiricamente com PL 901/2024 (ID 2617274). Campos opcionais
// são marcados nullable + passthrough pra tolerar variações.

export const camaraTramitacaoSchema = z
  .object({
    // ISO-like sem timezone, ex: "2026-04-16T00:00". JS Date parsing é
    // suficiente — Câmara é BRT (UTC-3) mas inconsistente em algumas rows.
    dataHora: z.string().min(1),
    // Inteiro estável por proposição. Eleito chave natural junto com
    // proposicao_id (ver schema de proposicoes/tramitacao).
    sequencia: z.number().int(),
    // Sigla do órgão/comissão (PLEN, MESA, CCJC, etc).
    siglaOrgao: z.string().min(1),
    // Descrição curta do evento (ex: "Publicação de Documento").
    descricaoTramitacao: z.string().min(1),
    // Estado após o evento (texto livre, varia muito).
    descricaoSituacao: z.string().nullable().optional(),
    // Texto longo do despacho — frequentemente repete `descricaoTramitacao`
    // mas pode conter contexto adicional valioso.
    despacho: z.string().nullable().optional(),
  })
  .passthrough()

export type CamaraTramitacao = z.infer<typeof camaraTramitacaoSchema>
