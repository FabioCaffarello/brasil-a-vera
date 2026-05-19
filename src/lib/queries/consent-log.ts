// Queries para `usuario.consent_log` — Wave 10 Etapa 5 (antecipada),
// refinada em 9.2.
//
// Audit trail de consentimentos LGPD. Inserts são append-only — não
// atualizamos linhas existentes; cada mudança de opt-in gera nova
// linha. Permite reconstruir histórico para exercício de direitos
// LGPD (Etapa 9 dashboard /meus-dados).
//
// `ipHash` é responsabilidade do caller — compute via
// `hashIpFromRequest` de `src/lib/ip-hash.ts`. Aceita string vazia
// (default) para preservar o log quando IP ou salt indisponíveis.

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
 * um usuário. Útil para checar "consentiu com marketing?" e para
 * o `<ConsentGate />` (Etapa 9.3) comparar a versão aceita contra
 * a versão corrente da política.
 */
export async function getLatestConsentByScope(
  userId: string,
  scope: string,
): Promise<
  { granted: boolean; consentedAt: Date; policyVersion: string } | undefined
> {
  const rows = await db
    .select({
      granted: consentLog.granted,
      consentedAt: consentLog.consentedAt,
      policyVersion: consentLog.policyVersion,
    })
    .from(consentLog)
    .where(and(eq(consentLog.userId, userId), eq(consentLog.scope, scope)))
    .orderBy(desc(consentLog.consentedAt))
    .limit(1)
  return rows[0]
}
