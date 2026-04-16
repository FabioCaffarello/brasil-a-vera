import { InvalidArgumentError } from '../errors/invalid-argument.error'
import { ValueObject } from '../value-object'

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class Uuid extends ValueObject {
  readonly id: string

  constructor(id?: string) {
    super()
    this.id = id ?? crypto.randomUUID()
    this.validate()
  }

  private validate(): void {
    if (!UUID_REGEX.test(this.id)) {
      throw new InvalidArgumentError(`Value ${this.id} is not a valid UUID`)
    }
  }

  toString(): string {
    return this.id
  }
}
