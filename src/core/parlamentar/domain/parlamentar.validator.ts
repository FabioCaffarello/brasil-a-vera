import { z } from 'zod'
import type { Notification } from '@/core/shared/domain/validators/notification'
import { validateWithZod } from '@/core/shared/domain/validators/zod-validator'

const parlamentarSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255),
  uf: z.string().length(2, 'UF deve ter 2 caracteres'),
  casa: z.enum(['CAMARA', 'SENADO'], {
    message: 'Casa deve ser CAMARA ou SENADO',
  }),
  partidoAtual: z.object({
    sigla: z.string().min(1, 'Sigla do partido é obrigatória'),
    nome: z.string().min(1, 'Nome do partido é obrigatório'),
  }),
})

export function validateParlamentar(
  notification: Notification,
  data: unknown,
): boolean {
  return validateWithZod(notification, parlamentarSchema, data)
}
