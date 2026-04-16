export class Notification {
  errors = new Map<string, string[]>()

  addError(error: string, field?: string): void {
    const key = field ?? '_errors'
    const errors = this.errors.get(key) ?? []
    if (!errors.includes(error)) {
      errors.push(error)
    }
    this.errors.set(key, errors)
  }

  setError(error: string | string[], field?: string): void {
    const key = field ?? '_errors'
    this.errors.set(key, Array.isArray(error) ? error : [error])
  }

  hasErrors(): boolean {
    return this.errors.size > 0
  }

  copyErrors(notification: Notification): void {
    for (const [field, errors] of notification.errors) {
      for (const error of errors) {
        this.addError(error, field)
      }
    }
  }

  toJSON(): Array<{ [key: string]: string[] }> {
    const result: Array<{ [key: string]: string[] }> = []
    for (const [key, value] of this.errors) {
      result.push({ [key]: value })
    }
    return result
  }
}
