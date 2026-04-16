import { ValueObject } from '@/core/shared/domain/value-object'
import type { TipoOrientacao } from './tipo-orientacao.vo'

export class OrientacaoBancada extends ValueObject {
  readonly partidoSigla: string
  readonly orientacao: TipoOrientacao

  constructor(partidoSigla: string, orientacao: TipoOrientacao) {
    super()
    this.partidoSigla = partidoSigla
    this.orientacao = orientacao
  }
}
