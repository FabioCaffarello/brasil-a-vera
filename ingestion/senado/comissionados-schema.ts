import { z } from 'zod'

// Boundary Zod da API administrativa do Senado (ADR-064 E2). Shapes
// verificados empiricamente em 2026-07-14 (probe Fase C):
//
// GET /servidores/servidores/comissionados → array de:
//   { sequencial, nome, vinculo: 'COMISSIONADO', situacao: 'ATIVO'|'DESLIGADO',
//     cargo, funcao, lotacao: { sigla: 'GS…', nome: 'Gabinete do Senador X' },
//     categoria: { codigo, nome }, ... }
//
// GET /servidores/remuneracoes/{ano}/{mes} → array de folhas por pessoa:
//   { sequencial, nome, mes, ano, tipo_folha: 'Normal'|'Suplementar',
//     remuneracao_basica: '789,41' (vírgula decimal pt-BR), ... }

// cargo/funcao vêm como OBJETO {codigo?, nome} ou null (verificado contra o
// payload real: tipos {'cargo': ['NoneType','dict'], 'funcao': idem}).
const nomeadoSchema = z
  .object({ nome: z.string().nullable().optional() })
  .passthrough()
  .nullable()
  .optional()

export const senadoComissionadoItemSchema = z
  .object({
    sequencial: z.union([z.string(), z.number()]).transform(String),
    nome: z.string().min(1),
    vinculo: z.string().nullable().optional(),
    situacao: z.string().nullable().optional(),
    cargo: nomeadoSchema,
    funcao: nomeadoSchema,
    lotacao: z
      .object({
        sigla: z.string().nullable().optional(),
        nome: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
  })
  .passthrough()

export type SenadoComissionadoItem = z.infer<
  typeof senadoComissionadoItemSchema
>

export const senadoComissionadosListaSchema = z.array(
  senadoComissionadoItemSchema,
)

// ⚠️ O `sequencial` de /remuneracoes é um ESPAÇO DE ID DIFERENTE do
// `sequencial` de /comissionados (verificado empiricamente em 2026-07-16:
// interseção de 238 em 3.605, todas com básica 0,00 — colisões, não joins).
// O join real é por NOME normalizado (98,5% de cobertura; homônimos —
// mesmo nome com sequenciais distintos DENTRO da folha — são descartados,
// fail-closed).
export const senadoRemuneracaoItemSchema = z
  .object({
    sequencial: z.union([z.string(), z.number()]).transform(String),
    nome: z.string().min(1),
    tipo_folha: z.string().nullable().optional(),
    remuneracao_basica: z.string().nullable().optional(),
  })
  .passthrough()

export type SenadoRemuneracaoItem = z.infer<typeof senadoRemuneracaoItemSchema>

export const senadoRemuneracoesListaSchema = z.array(
  senadoRemuneracaoItemSchema,
)
