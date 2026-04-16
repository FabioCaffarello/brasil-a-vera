import type { Casa } from '@/core/parlamentar/domain/value-objects/casa.vo'
import type { TrustLevel } from '@/core/shared/domain/value-objects/trust-metadata.vo'
import { TrustMetadata } from '@/core/shared/domain/value-objects/trust-metadata.vo'
import { Proposicao } from '../../../domain/proposicao.aggregate'
import { ProposicaoId } from '../../../domain/value-objects/proposicao-id.vo'
import {
  isSituacaoProposicao,
  type SituacaoProposicao,
} from '../../../domain/value-objects/situacao-proposicao.vo'
import { Tema } from '../../../domain/value-objects/tema.vo'
import {
  isTipoProposicao,
  type TipoProposicao,
} from '../../../domain/value-objects/tipo-proposicao.vo'
import type { proposicoes } from './proposicao.schema'

export type ProposicaoRow = typeof proposicoes.$inferSelect

export function proposicaoToPersistence(entity: Proposicao) {
  return {
    id: entity.proposicaoId.id,
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
    sourceUrl: entity.trust.sourceUrl ?? '',
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  }
}

export function proposicaoToDomain(row: ProposicaoRow): Proposicao {
  // Defensiva: se vier valor inesperado do banco, usamos fallback ('OUTRO' / 'DESCONHECIDA')
  // em vez de quebrar a leitura. Auditoria pode pegar via situacaoDescricao/idExterno.
  const tipo: TipoProposicao = isTipoProposicao(row.tipo) ? row.tipo : 'OUTRO'
  const situacao: SituacaoProposicao = isSituacaoProposicao(row.situacao)
    ? row.situacao
    : 'DESCONHECIDA'

  return new Proposicao({
    proposicaoId: new ProposicaoId(row.id),
    idExterno: row.idExterno,
    casa: row.casa as Casa,
    tipo,
    numero: row.numero,
    ano: row.ano,
    ementa: row.ementa,
    ementaDetalhada: row.ementaDetalhada,
    dataApresentacao: row.dataApresentacao,
    autores: row.autores ?? [],
    temas: (row.temas ?? []).map((t) => new Tema(t)),
    situacao,
    situacaoDescricao: row.situacaoDescricao,
    urlInteiroTeor: row.urlInteiroTeor,
    trust: new TrustMetadata(row.trustLevel as TrustLevel, row.sourceUrl),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
}
