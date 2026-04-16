import { ValueObject } from '@/core/shared/domain/value-object'

type TemaProps = {
  codigoOficial: number
  nome: string
}

export class Tema extends ValueObject {
  readonly codigoOficial: number
  readonly nome: string

  constructor(props: TemaProps) {
    super()
    this.codigoOficial = props.codigoOficial
    this.nome = props.nome
  }
}
