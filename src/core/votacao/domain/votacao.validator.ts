import { z } from 'zod'
import type { Notification } from '@/core/shared/domain/validators/notification'
import { validateWithZod } from '@/core/shared/domain/validators/zod-validator'

const votacaoSchema = z.object({
  descricao: z.string().min(1, 'Descrição é obrigatória'),
  orgao: z.string().min(1, 'Órgão é obrigatório'),
  dataHora: z.date({ message: 'Data/hora é obrigatória' }),
})

export function validateVotacao(
  notification: Notification,
  data: unknown,
): boolean {
  return validateWithZod(notification, votacaoSchema, data)
}
