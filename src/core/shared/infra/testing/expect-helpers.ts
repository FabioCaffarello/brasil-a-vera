import { expect } from 'vitest'
import type { EntityValidationError } from '../../domain/errors/validation.error'
import type { Notification } from '../../domain/validators/notification'
import type { FieldsErrors } from '../../domain/validators/validator.interface'

expect.extend({
  toContainNotificationErrorMessages(
    received: Notification,
    expected: Array<{ field: string; messages: string[] }>,
  ) {
    const errors = received.toJSON()
    const missingErrors: string[] = []

    for (const { field, messages } of expected) {
      const fieldErrors = errors.find((e) => e[field])
      if (!fieldErrors) {
        missingErrors.push(`Field "${field}" not found in notification errors`)
        continue
      }
      for (const message of messages) {
        if (!fieldErrors[field].includes(message)) {
          missingErrors.push(
            `Expected field "${field}" to contain error "${message}"`,
          )
        }
      }
    }

    return {
      pass: missingErrors.length === 0,
      message: () =>
        missingErrors.length > 0
          ? `Missing errors:\n${missingErrors.join('\n')}`
          : 'All expected errors found in notification',
    }
  },

  toContainValidationErrorMessages(
    received: EntityValidationError,
    expected: FieldsErrors,
  ) {
    const missingErrors: string[] = []

    for (const expectedEntry of expected) {
      for (const [field, messages] of Object.entries(expectedEntry)) {
        const foundEntry = received.errors.find((e) => e[field])
        if (!foundEntry) {
          missingErrors.push(`Field "${field}" not found in validation errors`)
          continue
        }
        for (const message of messages) {
          if (!foundEntry[field].includes(message)) {
            missingErrors.push(
              `Expected field "${field}" to contain error "${message}"`,
            )
          }
        }
      }
    }

    return {
      pass: missingErrors.length === 0,
      message: () =>
        missingErrors.length > 0
          ? `Missing errors:\n${missingErrors.join('\n')}`
          : 'All expected errors found in validation error',
    }
  },
})
