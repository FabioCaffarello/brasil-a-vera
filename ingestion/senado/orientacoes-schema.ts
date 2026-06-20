import { z } from 'zod'

// Schema da resposta de
//   GET /plenario/votacao/orientacaoBancada/{dataIni}/{dataFim}
// no Senado. Retorna um objeto `{ votacoes: [...] }`. Cada votação tem
// `codigoVotacaoSve` (id próprio do feed, NÃO compartilhado com `/votacao` —
// ver ADR-042), a identificação da matéria (sigla/número/ano) + `numeroSessao`
// (a chave de conteúdo que casa com a `votacao` persistida) e
// `orientacoesLideranca[]` com a orientação de cada partido/bloco.
//
// `voto` é uma string ("SIM"/"NÃO"/"LIVRE"/"OBSTRUÇÃO"/null). `partido` mistura
// siglas de partido e blocos institucionais/temáticos ("Governo", "Banc Fem").

export const senadoOrientacaoLinhaSchema = z
  .object({
    partido: z.string().min(1),
    voto: z.string().nullable().optional(),
    dataHora: z.string().nullable().optional(),
  })
  .passthrough()

export const senadoOrientacaoVotacaoSchema = z
  .object({
    codigoVotacaoSve: z.number().int(),
    siglaTipoMateria: z.string().nullable().optional(),
    numeroMateria: z.number().int().nullable().optional(),
    anoMateria: z.number().int().nullable().optional(),
    numeroSessao: z.number().int().nullable().optional(),
    descricaoVotacao: z.string().nullable().optional(),
    dataInicioVotacao: z.string().nullable().optional(),
    orientacoesLideranca: z.array(senadoOrientacaoLinhaSchema).optional(),
  })
  .passthrough()

export const senadoOrientacaoRespostaSchema = z
  .object({
    votacoes: z.array(senadoOrientacaoVotacaoSchema).optional(),
  })
  .passthrough()

export type SenadoOrientacaoVotacao = z.infer<
  typeof senadoOrientacaoVotacaoSchema
>
