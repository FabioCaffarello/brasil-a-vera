import { ValueObject } from '@/core/shared/domain/value-object'

export class Partido extends ValueObject {
  readonly sigla: string
  readonly nome: string

  /**
   * IMPORTANTE: NÃO normalizamos a casing da sigla. A fonte oficial preserva
   * casing mista (ex.: "PCdoB" — Partido Comunista do Brasil, "PSDB", "PT").
   * Uppercase destruiria informação legítima do TSE/Câmara/Senado.
   */
  constructor(sigla: string, nome: string) {
    super()
    this.sigla = sigla.trim()
    this.nome = nome
  }

  toString(): string {
    return this.sigla
  }
}
