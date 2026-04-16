import { z } from 'zod'
import type { Notification } from '@/core/shared/domain/validators/notification'
import { validateWithZod } from '@/core/shared/domain/validators/zod-validator'

const proposicaoSchema = z.object({
  idExterno: z.string().min(1, 'idExterno é obrigatório'),
  tipo: z.string().min(1, 'tipo é obrigatório'),
  numero: z.number().int().positive('numero deve ser positivo'),
  ano: z.number().int().positive('ano deve ser positivo'),
  ementa: z.string().min(1, 'ementa é obrigatória'),
})

export function validateProposicao(
  notification: Notification,
  data: unknown,
): boolean {
  return validateWithZod(notification, proposicaoSchema, data)
}
