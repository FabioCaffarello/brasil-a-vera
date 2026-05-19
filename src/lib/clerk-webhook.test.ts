// Unit tests do helper de webhook do Clerk (Wave 10 Etapa 1).
// Não toca DB — só verifica parsing, validação de assinatura e
// extração de campos derivados.

import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import {
  type ClerkEvent,
  composeDisplayName,
  extractPrimaryEmail,
  isRelevantClerkEvent,
  verifyClerkWebhook,
  WebhookVerificationError,
} from './clerk-webhook'

// Secret de teste no formato whsec_<base64>. Idem produção (Clerk usa
// esse prefixo). A lib svix aceita ambos com/sem prefixo.
const TEST_SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw'

/**
 * Reimplementa o protocolo Svix de assinatura aqui — só para os testes.
 * Production code NUNCA assina; só verifica via lib `svix`. O algoritmo:
 *   to_sign = `${svix_id}.${svix_timestamp}.${payload}`
 *   signature = `v1,${base64(hmacSha256(secret, to_sign))}`
 */
function signSvixPayload(
  payload: string,
  secret: string,
): { svixId: string; svixTimestamp: string; svixSignature: string } {
  const svixId = `msg_test_${Date.now()}`
  const svixTimestamp = Math.floor(Date.now() / 1000).toString()
  const toSign = `${svixId}.${svixTimestamp}.${payload}`
  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const hmac = createHmac('sha256', secretBytes).update(toSign).digest('base64')
  return { svixId, svixTimestamp, svixSignature: `v1,${hmac}` }
}

describe('verifyClerkWebhook', () => {
  it('lança erro se headers Svix ausentes', () => {
    expect(() =>
      verifyClerkWebhook(
        '{}',
        {
          'svix-id': null,
          'svix-timestamp': null,
          'svix-signature': null,
        },
        TEST_SECRET,
      ),
    ).toThrow(WebhookVerificationError)
  })

  it('lança erro se assinatura inválida', () => {
    expect(() =>
      verifyClerkWebhook(
        '{"type":"user.created","data":{}}',
        {
          'svix-id': 'msg_test',
          'svix-timestamp': Math.floor(Date.now() / 1000).toString(),
          'svix-signature': 'v1,signature-falsa-base64',
        },
        TEST_SECRET,
      ),
    ).toThrow(WebhookVerificationError)
  })

  it('aceita payload válido e devolve evento tipado', () => {
    const payload = JSON.stringify({
      type: 'user.created',
      data: {
        id: 'user_test',
        primary_email_address_id: 'idn_test',
        email_addresses: [
          { id: 'idn_test', email_address: 'fabio@example.com' },
        ],
        first_name: 'Fabio',
        last_name: 'Caffarello',
      },
    })

    const { svixId, svixTimestamp, svixSignature } = signSvixPayload(
      payload,
      TEST_SECRET,
    )

    const result = verifyClerkWebhook(
      payload,
      {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      },
      TEST_SECRET,
    )

    expect(result.type).toBe('user.created')
  })
})

describe('isRelevantClerkEvent', () => {
  it('reconhece user.created, user.updated, user.deleted', () => {
    const created: ClerkEvent = {
      type: 'user.created',
      data: {
        id: 'u1',
        primary_email_address_id: 'e1',
        email_addresses: [{ id: 'e1', email_address: 'a@b.com' }],
        first_name: 'A',
        last_name: 'B',
      },
    }
    const deleted: ClerkEvent = {
      type: 'user.deleted',
      data: { id: 'u1' },
    }
    const session: ClerkEvent = {
      type: 'session.created',
      data: {},
    }

    expect(isRelevantClerkEvent(created)).toBe(true)
    expect(isRelevantClerkEvent(deleted)).toBe(true)
    expect(isRelevantClerkEvent(session)).toBe(false)
  })
})

describe('extractPrimaryEmail', () => {
  it('retorna email cujo id bate com primary_email_address_id', () => {
    const email = extractPrimaryEmail({
      id: 'u1',
      primary_email_address_id: 'e2',
      email_addresses: [
        { id: 'e1', email_address: 'old@example.com' },
        { id: 'e2', email_address: 'primary@example.com' },
      ],
      first_name: null,
      last_name: null,
    })
    expect(email).toBe('primary@example.com')
  })

  it('faz fallback para o primeiro email se primary_id não bater', () => {
    const email = extractPrimaryEmail({
      id: 'u1',
      primary_email_address_id: 'inexistente',
      email_addresses: [{ id: 'e1', email_address: 'fallback@example.com' }],
      first_name: null,
      last_name: null,
    })
    expect(email).toBe('fallback@example.com')
  })

  it('lança erro se não houver nenhum email', () => {
    expect(() =>
      extractPrimaryEmail({
        id: 'u1',
        primary_email_address_id: null,
        email_addresses: [],
        first_name: null,
        last_name: null,
      }),
    ).toThrow()
  })
})

describe('composeDisplayName', () => {
  it('junta first_name + last_name', () => {
    expect(
      composeDisplayName({
        id: 'u1',
        primary_email_address_id: null,
        email_addresses: [],
        first_name: 'Fabio',
        last_name: 'Caffarello',
      }),
    ).toBe('Fabio Caffarello')
  })

  it('retorna só first_name se last_name é null', () => {
    expect(
      composeDisplayName({
        id: 'u1',
        primary_email_address_id: null,
        email_addresses: [],
        first_name: 'Fabio',
        last_name: null,
      }),
    ).toBe('Fabio')
  })

  it('retorna null se ambos são null ou vazios', () => {
    expect(
      composeDisplayName({
        id: 'u1',
        primary_email_address_id: null,
        email_addresses: [],
        first_name: null,
        last_name: null,
      }),
    ).toBeNull()

    expect(
      composeDisplayName({
        id: 'u1',
        primary_email_address_id: null,
        email_addresses: [],
        first_name: '',
        last_name: '   ',
      }),
    ).toBeNull()
  })
})
