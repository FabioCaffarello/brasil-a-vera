import { describe, expect, it } from 'vitest'

import {
  type BuildExportPayloadInput,
  buildExportPayload,
} from './export-payload'

const FIXED_EXPORT_AT = new Date('2026-05-19T12:00:00.000Z')
const FIXED_CREATED_AT = new Date('2026-05-01T10:00:00.000Z')

function makeUser(
  overrides: Partial<BuildExportPayloadInput['user']> = {},
): BuildExportPayloadInput['user'] {
  return {
    id: 'user-uuid',
    clerkUserId: 'user_clerk',
    email: 'titular@example.com',
    displayName: 'Titular Exemplo',
    uf: 'SP',
    themes: ['educacao', 'saude'],
    marketingOptedIn: true,
    surveyOptedIn: false,
    createdAt: FIXED_CREATED_AT,
    updatedAt: FIXED_CREATED_AT,
    deletedAt: null,
    onboardedAt: FIXED_CREATED_AT,
    ...overrides,
  }
}

const EMPTY_INPUT: BuildExportPayloadInput = {
  exportedAt: FIXED_EXPORT_AT,
  user: makeUser(),
  follows: [],
  alertPolicy: null,
  alertDeliveries: [],
  consentLog: [],
}

describe('buildExportPayload', () => {
  it('inclui schema versionado e timestamp ISO', () => {
    const out = buildExportPayload(EMPTY_INPUT)
    expect(out.schema).toBe('1')
    expect(out.exportedAt).toBe('2026-05-19T12:00:00.000Z')
  })

  it('serializa dados básicos do user', () => {
    const out = buildExportPayload(EMPTY_INPUT)
    expect(out.user.id).toBe('user-uuid')
    expect(out.user.email).toBe('titular@example.com')
    expect(out.user.displayName).toBe('Titular Exemplo')
    expect(out.user.uf).toBe('SP')
    expect(out.user.themes).toEqual(['educacao', 'saude'])
    expect(out.user.marketingOptedIn).toBe(true)
    expect(out.user.surveyOptedIn).toBe(false)
    expect(out.user.createdAt).toBe('2026-05-01T10:00:00.000Z')
  })

  it('serializa deletedAt null quando ausente', () => {
    const out = buildExportPayload(EMPTY_INPUT)
    expect(out.user.deletedAt).toBeNull()
  })

  it('serializa deletedAt como ISO quando setado', () => {
    const out = buildExportPayload({
      ...EMPTY_INPUT,
      user: makeUser({ deletedAt: new Date('2026-05-15T00:00:00.000Z') }),
    })
    expect(out.user.deletedAt).toBe('2026-05-15T00:00:00.000Z')
  })

  it('serializa follows ordenados pelo caller (preserva ordem)', () => {
    const out = buildExportPayload({
      ...EMPTY_INPUT,
      follows: [
        {
          userId: 'user-uuid',
          parlamentarId: 'parl-1',
          followedAt: new Date('2026-05-10T00:00:00.000Z'),
        },
        {
          userId: 'user-uuid',
          parlamentarId: 'parl-2',
          followedAt: new Date('2026-05-12T00:00:00.000Z'),
        },
      ],
    })
    expect(out.follows).toEqual([
      { parlamentarId: 'parl-1', followedAt: '2026-05-10T00:00:00.000Z' },
      { parlamentarId: 'parl-2', followedAt: '2026-05-12T00:00:00.000Z' },
    ])
  })

  it('alertPolicy null quando ausente', () => {
    const out = buildExportPayload(EMPTY_INPUT)
    expect(out.alertPolicy).toBeNull()
  })

  it('alertPolicy populado quando presente', () => {
    const out = buildExportPayload({
      ...EMPTY_INPUT,
      alertPolicy: {
        userId: 'user-uuid',
        cadence: 'weekly',
        channelEmail: true,
        channelInapp: true,
        topicVotacoes: true,
        topicGastos: false,
        topicProposicoes: true,
        topicDiscursos: false,
        topicDivergencias: true,
        boostEleicoes: true,
        boostCpis: true,
        boostProposicoesMarcadas: true,
        updatedAt: new Date('2026-05-05T00:00:00.000Z'),
      },
    })
    expect(out.alertPolicy).toMatchObject({
      cadence: 'weekly',
      channelEmail: true,
      topicVotacoes: true,
      topicGastos: false,
      updatedAt: '2026-05-05T00:00:00.000Z',
    })
  })

  it('omite bodyMd em alertDeliveries (reduz tamanho)', () => {
    const out = buildExportPayload({
      ...EMPTY_INPUT,
      alertDeliveries: [
        {
          id: 'delivery-1',
          userId: 'user-uuid',
          idempotencyKey: 'idem-1',
          channel: 'email',
          subject: 'Resumo 10/05-17/05',
          bodyMd: '# Lorem ipsum'.repeat(1000),
          scheduledFor: new Date('2026-05-17T21:00:00.000Z'),
          deliveredAt: new Date('2026-05-17T21:01:00.000Z'),
          readAt: null,
          status: 'sent',
        },
      ],
    })
    expect(out.alertDeliveries).toHaveLength(1)
    expect(out.alertDeliveries[0]).not.toHaveProperty('bodyMd')
    expect(out.alertDeliveries[0].subject).toBe('Resumo 10/05-17/05')
    expect(out.alertDeliveries[0].status).toBe('sent')
  })

  it('omite ipHash em consentLog (mecanismo interno)', () => {
    const out = buildExportPayload({
      ...EMPTY_INPUT,
      consentLog: [
        {
          id: 'consent-1',
          userId: 'user-uuid',
          scope: 'marketing',
          granted: true,
          legalBasis: 'art_7_I',
          policyVersion: '2026-05-19',
          source: 'painel_configuracoes',
          ipHash: 'abc123hash',
          consentedAt: new Date('2026-05-10T15:00:00.000Z'),
        },
      ],
    })
    expect(out.consentLog).toHaveLength(1)
    expect(out.consentLog[0]).not.toHaveProperty('ipHash')
    expect(out.consentLog[0].scope).toBe('marketing')
    expect(out.consentLog[0].policyVersion).toBe('2026-05-19')
  })

  it('JSON.stringify produz string válida (round-trip)', () => {
    const out = buildExportPayload({
      ...EMPTY_INPUT,
      consentLog: [
        {
          id: 'consent-1',
          userId: 'user-uuid',
          scope: 'marketing',
          granted: true,
          legalBasis: 'art_7_I',
          policyVersion: '2026-05-19',
          source: 'painel_configuracoes',
          ipHash: '',
          consentedAt: new Date('2026-05-10T15:00:00.000Z'),
        },
      ],
    })
    const json = JSON.stringify(out)
    const parsed = JSON.parse(json)
    expect(parsed.schema).toBe('1')
    expect(parsed.consentLog[0].scope).toBe('marketing')
  })
})
