// Queries para `usuario.consent_log` — Wave 10 Etapa 5 (antecipada).
//
// Audit trail de consentimentos LGPD. Inserts são append-only — não
// atualizamos linhas existentes; cada mudança de opt-in gera nova
// linha. Permite reconstruir histórico para exercício de direitos
// LGPD (Etapa 9 dashboard /meus-dados).
//
// `ip_hash` (ADR-031 §D2): aceita string vazia até Etapa 9 implementar
// salt diário completo. Por enquanto registramos `''` — log do consent
// continua funcional para audit; reidentificação via IP fica para
// quando o framework completo entrar.

import { and, desc, eq } from 'drizzle-orm'

import { consentLog } from '@/modules/usuario/domain/schema'
import { db } from '@/shared/db'

export interface RecordConsentInput {
  userId: string
  scope: string
  granted: boolean
  legalBasis: string
  policyVersion: string
  source: string
  ipHash?: string
}

/**
 * Insere uma linha em consent_log. Append-only — para revogar um
 * consent, chame de novo com `granted: false`. Idempotência:
 * NÃO é idempotente por design (cada chamada é um evento distinto
 * de manifestação de vontade do titular).
 */
export async function recordConsent(input: RecordConsentInput): Promise<void> {
  await db.insert(consentLog).values({
    userId: input.userId,
    scope: input.scope,
    granted: input.granted,
    legalBasis: input.legalBasis,
    policyVersion: input.policyVersion,
    source: input.source,
    ipHash: input.ipHash ?? '',
  })
}

/**
 * Retorna o estado atual (linha mais recente) de cada scope para
 * um usuário. Útil para checar "consentiu com marketing?" sem
 * materializar o log inteiro.
 */
export async function getLatestConsentByScope(
  userId: string,
  scope: string,
): Promise<{ granted: boolean; consentedAt: Date } | undefined> {
  const rows = await db
    .select({
      granted: consentLog.granted,
      consentedAt: consentLog.consentedAt,
    })
    .from(consentLog)
    .where(and(eq(consentLog.userId, userId), eq(consentLog.scope, scope)))
    .orderBy(desc(consentLog.consentedAt))
    .limit(1)
  return rows[0]
}
