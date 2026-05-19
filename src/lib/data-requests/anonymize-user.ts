// Anonimização LGPD (irreversível) — Wave 10 Etapa 9.4.
//
// Limpa PII do user_profile preservando a linha como esqueleto
// histórico:
//   - email → string vazia (NOT NULL no schema)
//   - display_name → null
//   - clerk_user_id → 'anon_<uuid>' (placeholder único; preserva
//     unique constraint, desconecta da identidade Clerk)
//   - uf → null
//   - themes → []
//   - marketing/survey opt-in → false
//   - deleted_at → now() (também marca para hard delete na 9.6)
//
// `consent_log` permanece intacto (FK SET NULL preserva log após
// hard delete — LGPD art. 8º §6º, comprovação de consentimento
// não identificável). `follows` é cascade-deletado quando o
// hard delete chegar; até lá, ficam "órfãos" mas sem PII.
//
// Diferença vs erase: erase é reversível por 30 dias (PII fica
// no banco), anonymize é imediato e irreversível. ADR-031 §3
// formaliza ambos os caminhos.
//
// Idempotente: a UPDATE limpa para o mesmo estado independente
// do estado atual; chamar duas vezes não muda nada.

import { eq, sql } from 'drizzle-orm'
import { uuidv7 } from 'uuidv7'

import { userProfile } from '@/modules/usuario/domain/schema'
import { db } from '@/shared/db'

export async function anonymizeUser(internalUserId: string): Promise<void> {
  // O clerk_user_id precisa ser único por causa do unique index.
  // Após anonimização, futuras autenticações do MESMO Clerk user
  // criam um NOVO user_profile (lazy upsert na RSC do /painel),
  // porque o lookup por clerk_user_id original não encontra mais
  // este profile (foi renomeado para anon_<uuid>).
  const anonId = `anon_${uuidv7()}`

  await db
    .update(userProfile)
    .set({
      clerkUserId: anonId,
      email: '',
      displayName: null,
      uf: null,
      themes: [],
      marketingOptedIn: false,
      surveyOptedIn: false,
      deletedAt: sql`now()`,
      updatedAt: sql`now()`,
    })
    .where(eq(userProfile.id, internalUserId))
}
