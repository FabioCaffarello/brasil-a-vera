import type { ZodSchema } from 'zod'
import type { Notification } from './notification'

export function validateWithZod(
  notification: Notification,
  schema: ZodSchema,
  data: unknown,
): boolean {
  const result = schema.safeParse(data)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path.join('.')
      notification.addError(issue.message, field || undefined)
    }
  }
  return result.success
}
