import type { Proposicao } from '../../../domain/proposicao.aggregate'

export type ProposicaoOutput = {
  proposicaoId: string
  idExterno: string
  casa: string
  tipo: string
  numero: number
  ano: number
  ementa: string
  ementaDetalhada: string | null
  dataApresentacao: Date | null
  autores: string[]
  temas: Array<{ codigoOficial: number; nome: string }>
  situacao: string
  situacaoDescricao: string | null
  urlInteiroTeor: string | null
  trustLevel: string
  sourceUrl: string | undefined
  createdAt: Date
  updatedAt: Date
}

export function toProposicaoOutput(entity: Proposicao): ProposicaoOutput {
  return {
    proposicaoId: entity.proposicaoId.id,
    idExterno: entity.idExterno,
    casa: entity.casa,
    tipo: entity.tipo,
    numero: entity.numero,
    ano: entity.ano,
    ementa: entity.ementa,
    ementaDetalhada: entity.ementaDetalhada,
    dataApresentacao: entity.dataApresentacao,
    autores: entity.autores,
    temas: entity.temas.map((t) => ({
      codigoOficial: t.codigoOficial,
      nome: t.nome,
    })),
    situacao: entity.situacao,
    situacaoDescricao: entity.situacaoDescricao,
    urlInteiroTeor: entity.urlInteiroTeor,
    trustLevel: entity.trust.trustLevel,
    sourceUrl: entity.trust.sourceUrl,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }
}
