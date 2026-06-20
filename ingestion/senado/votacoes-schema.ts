import { z } from 'zod'

// Schema da resposta de GET /votacao?datainicio=YYYYMMDD&datafim=YYYYMMDD
// no Senado. A API retorna array no top-level com cada votação contendo
// `votos[]` aninhado — uma única requisição cobre votação + nominais.
//
// `resultadoVotacao` é uma letra:
//   "A" = Aprovada, "R" = Rejeitada, demais valores raros = não decidido.

export const senadoVotoSchema = z
  .object({
    codigoParlamentar: z.number().int(),
    nomeParlamentar: z.string().min(1),
    siglaVotoParlamentar: z.string().min(1),
    descricaoVotoParlamentar: z.string().nullable().optional(),
    siglaPartidoParlamentar: z.string().nullable().optional(),
    siglaUFParlamentar: z.string().nullable().optional(),
  })
  .passthrough()

export type SenadoVoto = z.infer<typeof senadoVotoSchema>

export const senadoVotacaoSchema = z
  .object({
    codigoSessaoVotacao: z.number().int(),
    dataSessao: z.string().min(1),
    descricaoVotacao: z.string().min(1),
    resultadoVotacao: z.string().nullable().optional(),
    idProcesso: z.number().int().nullable().optional(),
    codigoMateria: z.number().int().nullable().optional(),
    sigla: z.string().nullable().optional(),
    numero: z.string().nullable().optional(),
    ano: z.number().int().nullable().optional(),
    // numeroSessao + matéria (sigla/numero/ano) formam a chave de conteúdo que
    // casa a orientação do feed `orientacaoBancada` com esta votação (ADR-042).
    numeroSessao: z.number().int().nullable().optional(),
    informeLegislativo: z
      .object({
        siglaColegiado: z.string().nullable().optional(),
        nomeColegiado: z.string().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    votos: z.array(senadoVotoSchema).optional(),
  })
  .passthrough()

export type SenadoVotacao = z.infer<typeof senadoVotacaoSchema>
