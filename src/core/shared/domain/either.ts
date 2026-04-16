export type Either<Ok, Error> = Ok | Error

export class Ok<T = unknown> {
  readonly ok: T

  constructor(value: T) {
    this.ok = value
  }

  isOk(): this is Ok<T> {
    return true
  }

  isFail(): this is Fail<never> {
    return false
  }

  map<U>(fn: (value: T) => U): Either<Ok<U>, Fail<never>> {
    return ok(fn(this.ok))
  }

  chain<U, E>(
    fn: (value: T) => Either<Ok<U>, Fail<E>>,
  ): Either<Ok<U>, Fail<E>> {
    return fn(this.ok)
  }

  *[Symbol.iterator](): Generator<this, T> {
    return yield this
  }
}

export class Fail<T = unknown> {
  readonly error: T

  constructor(error: T) {
    this.error = error
  }

  isOk(): this is Ok<never> {
    return false
  }

  isFail(): this is Fail<T> {
    return true
  }

  map<U>(_fn: (value: never) => U): Either<Ok<U>, Fail<T>> {
    return fail(this.error)
  }

  chain<U, E>(
    _fn: (value: never) => Either<Ok<U>, Fail<E>>,
  ): Either<Ok<never>, Fail<T>> {
    return fail(this.error)
  }

  *[Symbol.iterator](): Generator<this, never> {
    return yield this
  }
}

export function ok<T>(value: T): Ok<T> {
  return new Ok(value)
}

export function fail<T>(error: T): Fail<T> {
  return new Fail(error)
}

export function safe<T>(fn: () => T): Either<Ok<T>, Fail<unknown>> {
  try {
    return ok(fn())
  } catch (error) {
    return fail(error)
  }
}

export async function safeAsync<T>(
  fn: () => Promise<T>,
): Promise<Either<Ok<T>, Fail<unknown>>> {
  try {
    return ok(await fn())
  } catch (error) {
    return fail(error)
  }
}

export function of<T>(value: T): Ok<T> {
  return ok(value)
}

export function chainEach<T, E>(
  items: T[],
  fn: (item: T) => Either<Ok<T>, Fail<E>>,
): Either<Ok<T[]>, Fail<E>> {
  const results: T[] = []
  for (const item of items) {
    const result = fn(item)
    if (result.isFail()) {
      return fail(result.error)
    }
    results.push((result as Ok<T>).ok)
  }
  return ok(results)
}
