import { z } from 'zod'

// Schemas Zod para a chain de vetos presidenciais do Congresso Nacional.
// Três endpoints validados empiricamente (princípio 13, 2026-06-24):
//   GET /materia/vetos/{ano}                           → ListaVetosAnoCN
//   GET /plenario/resultado/veto/materia/{materiaCod}  → ResultadoVetoMateriaCN
//   GET /plenario/resultado/veto/dispositivo/{cod}     → ResultadoVetoDispositivoCN
//
// XML-convertido-em-JSON: elementos repetíveis chegam como objeto único ou
// array. `oneOrMany` normaliza para array.

const oneOrMany = <T extends z.ZodTypeAny>(schema: T) =>
  z
    .union([z.array(schema), schema])
    .transform((v) => (Array.isArray(v) ? v : [v]))

// ── 1. Lista de vetos por ano ─────────────────────────────────────────────

const materiaListaSchema = z
  .object({
    Codigo: z.string(),
    Sigla: z.string().optional(),
    Numero: z.string(),
    Ano: z.string(),
    EmTramitacao: z.string().optional(),
    Ementa: z.string().optional(),
  })
  .passthrough()

const materiaVetadaListaSchema = z
  .object({
    Sigla: z.string().optional(),
    Numero: z.string().optional(),
    Ano: z.string().optional(),
    Ementa: z.string().optional(),
  })
  .passthrough()

const vetoItemSchema = z
  .object({
    Codigo: z.string(),
    Materia: materiaListaSchema,
    MateriaVetada: materiaVetadaListaSchema.optional(),
    // "Sim" = veto total; "Não" = parcial
    Total: z.string().optional(),
    Assunto: z.string().optional(),
    DataPublicacao: z.string().optional(),
    DataRecebimentoCongresso: z.string().optional(),
    SobrestandoPauta: z.string().optional(),
  })
  .passthrough()

export const listaVetosAnoSchema = z
  .object({
    ListaVetosAnoCN: z.object({
      Vetos: z
        .object({
          Veto: oneOrMany(vetoItemSchema).optional(),
        })
        .nullable()
        .optional(),
    }),
  })
  .passthrough()

export type ListaVetosAno = z.infer<typeof listaVetosAnoSchema>

// ── 2. Resultado de veto por matéria (dispositivos + situação) ────────────

const dispositivoSchema = z
  .object({
    Codigo: z.string(),
    Identificador: z.string(),
    Descricao: z.string().optional(),
    Assunto: z.string().optional(),
    Situacao: z.string().optional(),
    PossuiVotos: z.string().optional(),
    TipoVotacao: z.string().optional(),
    DataSessao: z.string().optional(),
  })
  .passthrough()

export const resultadoVetoMateriaSchema = z
  .object({
    ResultadoVetoMateriaCN: z.object({
      Veto: z
        .object({
          Codigo: z.string().optional(),
          Materia: z
            .object({
              Codigo: z.string(),
              EmTramitacao: z.string().optional(),
            })
            .passthrough()
            .optional(),
          Dispositivos: z
            .object({
              Dispositivo: oneOrMany(dispositivoSchema).optional(),
            })
            .nullable()
            .optional(),
        })
        .passthrough(),
    }),
  })
  .passthrough()

export type ResultadoVetoMateria = z.infer<typeof resultadoVetoMateriaSchema>

// ── 3. Resultado de dispositivo (votos nominais CN) ───────────────────────

const votoSchema = z
  .object({
    NomeParlamentar: z.string(),
    PartidoParlamentar: z.string().optional(),
    UfParlamentar: z.string().optional(),
    TipoVoto: z.string(),
  })
  .passthrough()

// Câmara/Senado podem ser null ou objeto vazio {} quando não há votos
const casaVotosSchema = z
  .object({
    Voto: oneOrMany(votoSchema).optional(),
  })
  .nullable()
  .optional()

export const resultadoVetoDispositivoSchema = z
  .object({
    ResultadoVetoDispositivoCN: z.object({
      Votacao: z
        .object({
          TipoVotacao: z.string().optional(),
          Sessao: z.string().optional(),
          Camara: casaVotosSchema,
          Senado: casaVotosSchema,
        })
        .passthrough()
        .nullable()
        .optional(),
    }),
  })
  .passthrough()

export type ResultadoVetoDispositivo = z.infer<
  typeof resultadoVetoDispositivoSchema
>
