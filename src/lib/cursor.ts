import type { ZodType } from 'zod'

// Cursor opaco versionado para paginação SSR (ADR-026).
//
// Encode: JSON → base64url. Decode: base64url → JSON → Zod parse.
// Versionamento vive no payload (`{v: 1, ...}`); o decoder aceita um
// Zod schema por lista, falhando explicitamente quando a versão muda
// ou o shape diverge.

function base64UrlEncode(s: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }
  // Fallback Node — usado em testes vitest com environment 'node'.
  return Buffer.from(s, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function base64UrlDecode(token: string): string {
  const b64 = token.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '=='.slice(0, (4 - (b64.length % 4)) % 4)
  if (typeof atob !== 'undefined') {
    return atob(padded)
  }
  return Buffer.from(padded, 'base64').toString('utf-8')
}

/** Serializa o payload em token opaco base64url. */
export function encodeCursor<T>(payload: T): string {
  return base64UrlEncode(JSON.stringify(payload))
}

/**
 * Decodifica e valida o token. Semântica:
 * - `undefined`: nenhum token (param ausente)
 * - `null`: token presente mas inválido (versão antiga, shape errado,
 *   base64 corrompido) — caller deve `permanentRedirect` strip do param
 *   (ADR-026 §5)
 * - `T`: token válido conforme `schema`
 */
export function decodeCursor<T>(
  token: string | undefined,
  schema: ZodType<T>,
): T | null | undefined {
  if (!token) return undefined
  try {
    const decoded = JSON.parse(base64UrlDecode(token))
    return schema.parse(decoded)
  } catch {
    return null
  }
}
