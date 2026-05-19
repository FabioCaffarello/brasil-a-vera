// Webhook endpoint do Clerk — Wave 10 Etapa 1.
//
// Mantém `usuario.user_profile` em sincronia com o Clerk. Lê body raw
// (Svix verifica HMAC sobre o texto exato), valida assinatura, parseia
// payload, despacha para query handler.
//
// Configuração no Clerk Dashboard (tarefa externa):
//   Webhooks → Add Endpoint
//   URL: https://brasilavera.org/api/webhooks/clerk
//   Eventos: user.created, user.updated, user.deleted
//   Signing secret → CLERK_WEBHOOK_SECRET (Workers Secret + .env.local)
//
// NÃO PROTEGER COM clerkMiddleware: o auth é via Svix HMAC, não via
// session Clerk. O matcher do middleware exclui `/api/webhooks/*`.

import { NextResponse } from 'next/server'

import {
  type ClerkEvent,
  composeDisplayName,
  extractPrimaryEmail,
  isRelevantClerkEvent,
  verifyClerkWebhook,
  WebhookVerificationError,
} from '@/lib/clerk-webhook'
import {
  softDeleteUserProfile,
  upsertUserProfileFromClerk,
} from '@/lib/queries/user-profile'

// Force dynamic — body raw + headers de assinatura por request.
export const dynamic = 'force-dynamic'
// Body do webhook é JSON pequeno (~1-5KB). Limite default do Next basta.

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET
  if (!secret) {
    // Misconfiguration server-side: log e 500. Não vazar detalhe ao caller.
    console.error('[clerk-webhook] CLERK_WEBHOOK_SECRET não configurado')
    return new NextResponse('Server misconfigured', { status: 500 })
  }

  // Body raw como string — Svix verifica HMAC sobre o texto bruto.
  // req.text() preserva sem reparsing JSON.
  const body = await req.text()
  const headers = {
    'svix-id': req.headers.get('svix-id'),
    'svix-timestamp': req.headers.get('svix-timestamp'),
    'svix-signature': req.headers.get('svix-signature'),
  }

  let event: ClerkEvent
  try {
    event = verifyClerkWebhook(body, headers, secret)
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      // 400: payload malformado ou assinatura inválida. Clerk não
      // reenvia em 4xx (dead-letter no dashboard se persistente).
      console.warn(`[clerk-webhook] verificação falhou: ${err.message}`)
      return new NextResponse('Invalid webhook', { status: 400 })
    }
    throw err
  }

  // Eventos irrelevantes (session.*, organization.*, etc.) — 200 OK
  // silencioso. Clerk só envia o que configurarmos no dashboard, mas
  // ser defensivo evita ruído de log se alguém habilitar mais eventos
  // por engano.
  if (!isRelevantClerkEvent(event)) {
    return new NextResponse(null, { status: 200 })
  }

  try {
    switch (event.type) {
      case 'user.created':
      case 'user.updated': {
        await upsertUserProfileFromClerk({
          clerkUserId: event.data.id,
          email: extractPrimaryEmail(event.data),
          displayName: composeDisplayName(event.data),
        })
        break
      }
      case 'user.deleted': {
        await softDeleteUserProfile(event.data.id)
        break
      }
    }
  } catch (err) {
    // 5xx para Clerk reenviar (retry exponencial). Log detalhado
    // server-side para diagnose.
    console.error(
      `[clerk-webhook] erro processando ${event.type} (${event.data.id}):`,
      err,
    )
    return new NextResponse('Internal error', { status: 500 })
  }

  return new NextResponse(null, { status: 200 })
}
