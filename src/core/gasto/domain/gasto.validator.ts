import { z } from 'zod'
import type { Notification } from '@/core/shared/domain/validators/notification'
import { validateWithZod } from '@/core/shared/domain/validators/zod-validator'

const gastoSchema = z.object({
  parlamentarIdExterno: z.string().min(1, 'parlamentarIdExterno é obrigatório'),
  tipoDespesa: z.string().min(1, 'tipoDespesa é obrigatório'),
  ano: z.number().int().positive('ano deve ser positivo'),
  mes: z.number().int().min(1, 'mes mínimo é 1').max(12, 'mes máximo �� 12'),
})

export function validateGasto(
  notification: Notification,
  data: unknown,
): boolean {
  return validateWithZod(notification, gastoSchema, data)
}
