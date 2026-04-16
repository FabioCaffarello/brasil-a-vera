import type { Entity } from '../entity'
import type { ValueObject } from '../value-object'

/**
 * Signature de construtor genérica o suficiente para aceitar QUALQUER
 * aggregate root do projeto (que tem `constructor(props: SpecificProps)`),
 * sem perder a garantia de que produz uma `Entity`.
 *
 * Por que `never[]` em vez de `unknown[]`: parâmetros são contravariantes
 * em modo strict. `unknown[]` exige que a função aceite `unknown`, o que
 * aggregates concretos NÃO fazem (cada um exige props específicas).
 * `never[]` é o tipo bottom — qualquer signature concreta o satisfaz.
 */
export type EntityConstructor = {
  new (...args: never[]): Entity
  name: string
}

export class NotFoundError extends Error {
  constructor(id: ValueObject | string, entityClass: EntityConstructor) {
    const idValue = typeof id === 'string' ? id : JSON.stringify(id)
    super(`${entityClass.name} not found using ID ${idValue}`)
    this.name = 'NotFoundError'
  }
}
