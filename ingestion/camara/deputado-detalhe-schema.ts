import { z } from 'zod'

// Schema da resposta de GET /deputados/{id} (detalhe individual).
// Documentação: https://dadosabertos.camara.leg.br/swagger/api.html
//
// Por que existe: a listagem /deputados NÃO traz `cpf` (vem null no mapper da
// listagem). O detalhe traz `dados.cpf` como 11 dígitos sem pontuação. Usamos
// só para enriquecer `parlamentar.cpf` — a única ponte determinística para
// vincular candidaturas do TSE (Eixo 2 / Incremento 0). Senado não expõe CPF.
export const camaraDeputadoDetalheSchema = z
  .object({
    dados: z
      .object({
        id: z.union([z.string(), z.number()]).transform(String),
        cpf: z.string().nullable().optional(),
        nomeCivil: z.string().nullable().optional(),
        // Perfil biográfico (ADR-049) — autodeclarado.
        escolaridade: z.string().nullable().optional(),
        dataNascimento: z.string().nullable().optional(),
        municipioNascimento: z.string().nullable().optional(),
        ufNascimento: z.string().nullable().optional(),
      })
      .passthrough(),
  })
  .passthrough()

export type CamaraDeputadoDetalhe = z.infer<typeof camaraDeputadoDetalheSchema>

// GET /deputados/{id}/profissoes — lista; usamos só o título da primeira.
export const camaraProfissoesSchema = z
  .object({
    dados: z.array(
      z.object({ titulo: z.string().nullable().optional() }).passthrough(),
    ),
  })
  .passthrough()

export type CamaraProfissoes = z.infer<typeof camaraProfissoesSchema>
