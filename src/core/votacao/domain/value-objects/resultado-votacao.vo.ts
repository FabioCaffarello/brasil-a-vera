import { ValueObject } from '@/core/shared/domain/value-object'

export class ResultadoVotacao extends ValueObject {
  readonly votosSim: number
  readonly votosNao: number
  readonly abstencoes: number
  readonly ausentes: number
  readonly aprovada: boolean

  constructor(
    votosSim: number,
    votosNao: number,
    abstencoes: number,
    ausentes: number,
    aprovada: boolean,
  ) {
    super()
    this.votosSim = votosSim
    this.votosNao = votosNao
    this.abstencoes = abstencoes
    this.ausentes = ausentes
    this.aprovada = aprovada
  }

  get total(): number {
    return this.votosSim + this.votosNao + this.abstencoes + this.ausentes
  }
}
