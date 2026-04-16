import { AggregateRoot } from '@/core/shared/domain/aggregate-root'
import type { ValueObject } from '@/core/shared/domain/value-object'
import { TrustMetadata } from '@/core/shared/domain/value-objects/trust-metadata.vo'
import type { OrientacaoBancada } from './value-objects/orientacao-bancada.vo'
import { ResultadoVotacao } from './value-objects/resultado-votacao.vo'
import { VotacaoId } from './value-objects/votacao-id.vo'
import { validateVotacao } from './votacao.validator'
import type { VotoNominal } from './voto-nominal.entity'

export type VotacaoConstructorProps = {
  votacaoId?: VotacaoId
  idExterno: string
  proposicaoIdExterno?: string | null
  dataHora: Date
  descricao: string
  orgao: string
  resultado: ResultadoVotacao
  votos?: VotoNominal[]
  orientacoes?: OrientacaoBancada[]
  trust: TrustMetadata
  createdAt?: Date
  updatedAt?: Date
}

export type VotacaoCreateCommand = {
  idExterno: string
  proposicaoIdExterno?: string | null
  dataHora: Date
  descricao: string
  orgao: string
  votosSim: number
  votosNao: number
  abstencoes: number
  ausentes: number
  aprovada: boolean
  sourceUrl: string
}

export class Votacao extends AggregateRoot {
  votacaoId: VotacaoId
  idExterno: string
  proposicaoIdExterno: string | null
  dataHora: Date
  descricao: string
  orgao: string
  resultado: ResultadoVotacao
  votos: VotoNominal[]
  orientacoes: OrientacaoBancada[]
  trust: TrustMetadata
  createdAt: Date
  updatedAt: Date

  constructor(props: VotacaoConstructorProps) {
    super()
    this.votacaoId = props.votacaoId ?? new VotacaoId()
    this.idExterno = props.idExterno
    this.proposicaoIdExterno = props.proposicaoIdExterno ?? null
    this.dataHora = props.dataHora
    this.descricao = props.descricao
    this.orgao = props.orgao
    this.resultado = props.resultado
    this.votos = props.votos ?? []
    this.orientacoes = props.orientacoes ?? []
    this.trust = props.trust
    this.createdAt = props.createdAt ?? new Date()
    this.updatedAt = props.updatedAt ?? new Date()
  }

  get entityId(): ValueObject {
    return this.votacaoId
  }

  static create(command: VotacaoCreateCommand): Votacao {
    const votacao = new Votacao({
      idExterno: command.idExterno,
      proposicaoIdExterno: command.proposicaoIdExterno,
      dataHora: command.dataHora,
      descricao: command.descricao,
      orgao: command.orgao,
      resultado: new ResultadoVotacao(
        command.votosSim,
        command.votosNao,
        command.abstencoes,
        command.ausentes,
        command.aprovada,
      ),
      trust: TrustMetadata.official(command.sourceUrl),
    })
    votacao.validate()
    return votacao
  }

  addVoto(voto: VotoNominal): void {
    this.votos.push(voto)
    this.touch()
  }

  addOrientacao(orientacao: OrientacaoBancada): void {
    this.orientacoes.push(orientacao)
    this.touch()
  }

  validate(): boolean {
    return validateVotacao(this.notification, {
      descricao: this.descricao,
      orgao: this.orgao,
      dataHora: this.dataHora,
    })
  }

  private touch(): void {
    this.updatedAt = new Date()
  }

  toJSON(): Record<string, unknown> {
    return {
      votacaoId: this.votacaoId.id,
      idExterno: this.idExterno,
      proposicaoIdExterno: this.proposicaoIdExterno,
      dataHora: this.dataHora,
      descricao: this.descricao,
      orgao: this.orgao,
      resultado: {
        votosSim: this.resultado.votosSim,
        votosNao: this.resultado.votosNao,
        abstencoes: this.resultado.abstencoes,
        ausentes: this.resultado.ausentes,
        aprovada: this.resultado.aprovada,
      },
      votos: this.votos.map((v) => v.toJSON()),
      orientacoes: this.orientacoes.map((o) => ({
        partidoSigla: o.partidoSigla,
        orientacao: o.orientacao,
      })),
      trustLevel: this.trust.trustLevel,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    }
  }
}
