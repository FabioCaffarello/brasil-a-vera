import { ValueObject } from '@/core/shared/domain/value-object'

export class Partido extends ValueObject {
  readonly sigla: string
  readonly nome: string

  constructor(sigla: string, nome: string) {
    super()
    this.sigla = sigla.toUpperCase()
    this.nome = nome
  }

  toString(): string {
    return this.sigla
  }
}
