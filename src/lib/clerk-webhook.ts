// Verificação de assinatura + parse de payload de webhook do Clerk.
//
// Clerk envia webhooks via Svix com assinatura HMAC-SHA256 em headers
// `svix-id` / `svix-timestamp` / `svix-signature`. A lib oficial `svix`
// faz verificação em timing-safe e detecta replay attack (timestamp
// fora de uma janela de 5min). Reimplementar isso à mão é vetor de
// bug de segurança.
//
// Tipos de evento que tratamos (LOGGED-AREA-VISION §3, ADR-029):
// - user.created → upsert user_profile
// - user.updated → upsert user_profile (email/displayName podem mudar)
// - user.deleted → soft delete (deleted_at = now())
//
// Outros tipos (session.*, organization.*, etc.) são ignorados com 200 OK.

import { Webhook } from 'svix'
import { z } from 'zod'

// Schema mínimo dos campos que usamos. O payload do Clerk tem muito
// mais (público em https://clerk.com/docs/webhooks/overview). Zod aqui
// é boundary de confiança (princípio 2 do CLAUDE.md).
const emailAddressSchema = z.object({
  id: z.string(),
  email_address: z.string().email(),
})

const userDataSchema = z.object({
  id: z.string(),
  primary_email_address_id: z.string().nullable(),
  email_addresses: z.array(emailAddressSchema),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
})

const deletedUserDataSchema = z.object({
  id: z.string(),
  deleted: z.literal(true).optional(),
})

// Eventos que tratamos — `discriminatedUnion` exige literal em todos os
// ramos (Zod v4); por isso o catch-all de "outros eventos" vive num
// schema separado e o parser tenta o discriminator primeiro.
const relevantClerkEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('user.created'), data: userDataSchema }),
  z.object({ type: z.literal('user.updated'), data: userDataSchema }),
  z.object({ type: z.literal('user.deleted'), data: deletedUserDataSchema }),
])

// Captura-tudo para eventos que o Clerk pode enviar mas que ignoramos
// (session.*, organization.*, etc.). `data: unknown` — não inspecionamos.
const otherClerkEventSchema = z.object({
  type: z.string(),
  data: z.unknown(),
})

export type ClerkEvent =
  | z.infer<typeof relevantClerkEventSchema>
  | z.infer<typeof otherClerkEventSchema>

export type RelevantClerkEvent =
  | { type: 'user.created'; data: z.infer<typeof userDataSchema> }
  | { type: 'user.updated'; data: z.infer<typeof userDataSchema> }
  | { type: 'user.deleted'; data: z.infer<typeof deletedUserDataSchema> }

export class WebhookVerificationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WebhookVerificationError'
  }
}

export interface WebhookHeaders {
  'svix-id': string | null
  'svix-timestamp': string | null
  'svix-signature': string | null
}

/**
 * Verifica assinatura Svix + parseia o payload com Zod.
 * Throws `WebhookVerificationError` se assinatura inválida, headers
 * ausentes ou payload malformado.
 */
export function verifyClerkWebhook(
  body: string,
  headers: WebhookHeaders,
  secret: string,
): ClerkEvent {
  const svixId = headers['svix-id']
  const svixTimestamp = headers['svix-timestamp']
  const svixSignature = headers['svix-signature']

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new WebhookVerificationError(
      'Headers svix-id / svix-timestamp / svix-signature ausentes',
    )
  }

  const wh = new Webhook(secret)
  let verified: unknown
  try {
    verified = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    })
  } catch (err) {
    throw new WebhookVerificationError(
      `Assinatura Svix inválida: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  // Tenta o discriminator primeiro (eventos relevantes); se não bater,
  // cai no catch-all (eventos que ignoramos com 200 OK no handler).
  const relevant = relevantClerkEventSchema.safeParse(verified)
  if (relevant.success) return relevant.data

  const other = otherClerkEventSchema.safeParse(verified)
  if (other.success) return other.data

  throw new WebhookVerificationError(
    `Payload Clerk não conforma com schema: ${other.error.message}`,
  )
}

/**
 * Type guard — separa eventos que nos interessam dos que vamos ignorar.
 */
export function isRelevantClerkEvent(
  event: ClerkEvent,
): event is RelevantClerkEvent {
  return (
    event.type === 'user.created' ||
    event.type === 'user.updated' ||
    event.type === 'user.deleted'
  )
}

/**
 * Extrai email primário do payload Clerk. O `primary_email_address_id`
 * referencia uma das entradas em `email_addresses`. Falha defensiva se
 * não encontrar — usuário sem email primário no Clerk é estado anormal.
 */
export function extractPrimaryEmail(
  data: z.infer<typeof userDataSchema>,
): string {
  const primary = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id,
  )
  if (!primary) {
    // Fallback para o primeiro email — não é o ideal mas evita NPE em
    // edge cases (usuário sem primary marcado mas com emails).
    const first = data.email_addresses[0]
    if (first) return first.email_address
    throw new Error(`Usuário Clerk ${data.id} sem email_addresses`)
  }
  return primary.email_address
}

/**
 * Compõe display_name a partir de first_name + last_name. Ambos podem
 * ser nulos no Clerk (signup só com email não preenche). Retorna null
 * nesse caso — `display_name` é nullable no schema.
 */
export function composeDisplayName(
  data: z.infer<typeof userDataSchema>,
): string | null {
  const parts = [data.first_name, data.last_name].filter(
    (s): s is string => s !== null && s.trim() !== '',
  )
  if (parts.length === 0) return null
  return parts.join(' ')
}
