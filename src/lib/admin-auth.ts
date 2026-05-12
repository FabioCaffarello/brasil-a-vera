import { z } from 'zod'

export const ADMIN_KEY_HEADER = 'x-admin-key'

export type AdminAuthResult =
  | { ok: true }
  | { ok: false; reason: 'missing' | 'invalid' }

const adminKeySchema = z
  .string()
  .min(32, 'ADMIN_API_KEY deve ter pelo menos 32 caracteres')

export function getExpectedAdminKey(): string | null {
  const result = adminKeySchema.safeParse(process.env.ADMIN_API_KEY)
  return result.success ? result.data : null
}

export function checkAdminKey(
  headerValue: string | null,
  expected: string,
): AdminAuthResult {
  if (!headerValue) return { ok: false, reason: 'missing' }
  if (!constantTimeEqual(headerValue, expected)) {
    return { ok: false, reason: 'invalid' }
  }
  return { ok: true }
}

// Comparação de strings em tempo aproximadamente constante para evitar que
// timing de resposta vaze prefixos corretos da chave. JIT do V8 pode otimizar
// e reintroduzir variação, mas o risco residual é aceitável para um endpoint
// admin de baixíssimo tráfego.
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}
