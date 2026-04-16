import type { TrustLevel } from '@/core/shared/domain/value-objects/trust-metadata.vo'
import { TrustMetadata } from '@/core/shared/domain/value-objects/trust-metadata.vo'
import { OrientacaoBancada } from '../../../domain/value-objects/orientacao-bancada.vo'
import { ResultadoVotacao } from '../../../domain/value-objects/resultado-votacao.vo'
import type { TipoOrientacao } from '../../../domain/value-objects/tipo-orientacao.vo'
import type { TipoVoto } from '../../../domain/value-objects/tipo-voto.vo'
import { VotacaoId } from '../../../domain/value-objects/votacao-id.vo'
import { VotoNominalId } from '../../../domain/value-objects/voto-nominal-id.vo'
import { Votacao } from '../../../domain/votacao.aggregate'
import { VotoNominal } from '../../../domain/voto-nominal.entity'
import type {
  orientacoesBancada,
  votacoes,
  votosNominais,
} from './votacao.schema'

export type VotacaoRow = typeof votacoes.$inferSelect
export type VotoNominalRow = typeof votosNominais.$inferSelect
export type OrientacaoRow = typeof orientacoesBancada.$inferSelect

export function votacaoToPersistence(entity: Votacao) {
  return {
    votacao: {
      id: entity.votacaoId.id,
      idExterno: entity.idExterno,
      proposicaoIdExterno: entity.proposicaoIdExterno,
      dataHora: entity.dataHora,
      descricao: entity.descricao,
      orgao: entity.orgao,
      votosSim: entity.resultado.votosSim,
      votosNao: entity.resultado.votosNao,
      abstencoes: entity.resultado.abstencoes,
      ausentes: entity.resultado.ausentes,
      aprovada: entity.resultado.aprovada,
      trustLevel: entity.trust.trustLevel,
      sourceUrl: entity.trust.sourceUrl ?? '',
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    },
    votos: entity.votos.map((v) => ({
      id: v.votoNominalId.id,
      votacaoId: entity.votacaoId.id,
      parlamentarIdExterno: v.parlamentarIdExterno,
      tipoVoto: v.tipoVoto,
      dataHora: v.dataHora,
    })),
    orientacoes: entity.orientacoes.map((o) => ({
      votacaoId: entity.votacaoId.id,
      partidoSigla: o.partidoSigla,
      orientacao: o.orientacao,
    })),
  }
}

export function votacaoToDomain(
  row: VotacaoRow,
  votoRows: VotoNominalRow[],
  orientacaoRows: OrientacaoRow[],
): Votacao {
  return new Votacao({
    votacaoId: new VotacaoId(row.id),
    idExterno: row.idExterno,
    proposicaoIdExterno: row.proposicaoIdExterno ?? null,
    dataHora: row.dataHora,
    descricao: row.descricao,
    orgao: row.orgao,
    resultado: new ResultadoVotacao(
      row.votosSim,
      row.votosNao,
      row.abstencoes,
      row.ausentes,
      row.aprovada,
    ),
    votos: votoRows.map(
      (v) =>
        new VotoNominal({
          votoNominalId: new VotoNominalId(v.id),
          parlamentarIdExterno: v.parlamentarIdExterno,
          tipoVoto: v.tipoVoto as TipoVoto,
          dataHora: v.dataHora,
        }),
    ),
    orientacoes: orientacaoRows.map(
      (o) =>
        new OrientacaoBancada(o.partidoSigla, o.orientacao as TipoOrientacao),
    ),
    trust: new TrustMetadata(row.trustLevel as TrustLevel, row.sourceUrl),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
}
