import { describe, expect, it } from 'vitest'

import { decodeCursor, encodeCursor } from '@/lib/cursor'

import {
  CursorGastosV1,
  CursorProposicoesV1,
  CursorTramitacaoV1,
  CursorVotosV1,
} from './cursor-schemas'

// Sanity checks dos 4 schemas concretos do projeto. O comportamento
// genérico de encode/decode/version-check vive em cursor.test.ts com
// TestSchema interno; aqui validamos que CADA schema concreto:
//
// 1. Aceita um payload bem-formado (round-trip encode → decode preserva)
// 2. Rejeita payload com versão diferente (v != 1 → null)
// 3. Rejeita payload com shape divergente (campo do tipo errado → null)
//
// Esses testes protegem contra regressões silenciosas em schemas que
// alimentam URLs indexáveis (ADR-026). Se alguém mudar `v: literal(1)`
// para `v: literal(2)` sem renomear, todos os tokens v1 em produção
// quebram silenciosamente; este teste falha primeiro.

const NORMAL_UUID = '019e184f-0cdd-7109-ab34-bbfa9f92bd13'

describe('CursorVotosV1', () => {
  it('round-trip encode → decode preserva payload', () => {
    const payload = { v: 1 as const, d: 1_700_000_000_000, id: NORMAL_UUID }
    const token = encodeCursor(payload)
    expect(decodeCursor(token, CursorVotosV1)).toEqual(payload)
  })

  it('rejeita payload com versão diferente de 1', () => {
    const token = encodeCursor({ v: 2, d: 1_700_000_000_000, id: NORMAL_UUID })
    expect(decodeCursor(token, CursorVotosV1)).toBeNull()
  })

  it('rejeita payload sem o campo d', () => {
    const token = encodeCursor({ v: 1, id: NORMAL_UUID })
    expect(decodeCursor(token, CursorVotosV1)).toBeNull()
  })
})

describe('CursorProposicoesV1', () => {
  it('round-trip encode → decode preserva payload', () => {
    const payload = { v: 1 as const, a: 2025, n: 1234, id: NORMAL_UUID }
    const token = encodeCursor(payload)
    expect(decodeCursor(token, CursorProposicoesV1)).toEqual(payload)
  })

  it('rejeita ano fora do range razoável (1900-2200)', () => {
    const tooEarly = encodeCursor({ v: 1, a: 1899, n: 1, id: NORMAL_UUID })
    const tooLate = encodeCursor({ v: 1, a: 2201, n: 1, id: NORMAL_UUID })
    expect(decodeCursor(tooEarly, CursorProposicoesV1)).toBeNull()
    expect(decodeCursor(tooLate, CursorProposicoesV1)).toBeNull()
  })

  it('rejeita numero não-positivo (proposições começam em 1)', () => {
    const zero = encodeCursor({ v: 1, a: 2025, n: 0, id: NORMAL_UUID })
    const negative = encodeCursor({ v: 1, a: 2025, n: -1, id: NORMAL_UUID })
    expect(decodeCursor(zero, CursorProposicoesV1)).toBeNull()
    expect(decodeCursor(negative, CursorProposicoesV1)).toBeNull()
  })

  it('rejeita versão diferente de 1', () => {
    const token = encodeCursor({ v: 2, a: 2025, n: 1, id: NORMAL_UUID })
    expect(decodeCursor(token, CursorProposicoesV1)).toBeNull()
  })
})

describe('CursorGastosV1', () => {
  it('round-trip encode → decode preserva payload', () => {
    const payload = { v: 1 as const, d: 1_700_000_000_000, id: NORMAL_UUID }
    const token = encodeCursor(payload)
    expect(decodeCursor(token, CursorGastosV1)).toEqual(payload)
  })

  it('rejeita versão diferente de 1', () => {
    const token = encodeCursor({ v: 2, d: 1_700_000_000_000, id: NORMAL_UUID })
    expect(decodeCursor(token, CursorGastosV1)).toBeNull()
  })
})

describe('CursorTramitacaoV1', () => {
  it('round-trip encode → decode preserva payload', () => {
    const payload = { v: 1 as const, d: 1_700_000_000_000, id: NORMAL_UUID }
    const token = encodeCursor(payload)
    expect(decodeCursor(token, CursorTramitacaoV1)).toEqual(payload)
  })

  it('rejeita versão diferente de 1', () => {
    const token = encodeCursor({ v: 2, d: 1_700_000_000_000, id: NORMAL_UUID })
    expect(decodeCursor(token, CursorTramitacaoV1)).toBeNull()
  })

  it('rejeita timestamp não-positivo', () => {
    const zero = encodeCursor({ v: 1, d: 0, id: NORMAL_UUID })
    const negative = encodeCursor({ v: 1, d: -1, id: NORMAL_UUID })
    expect(decodeCursor(zero, CursorTramitacaoV1)).toBeNull()
    expect(decodeCursor(negative, CursorTramitacaoV1)).toBeNull()
  })

  it('aceita uuid v7 (formato usado por tramitacao.id)', () => {
    // uuid v7 começa com timestamp prefix — testa que regex de Zod não
    // rejeita o formato específico.
    const v7Like = '019e184f-0cdd-7109-ab34-bbfa9f92bd13'
    const token = encodeCursor({ v: 1, d: 1_700_000_000_000, id: v7Like })
    expect(decodeCursor(token, CursorTramitacaoV1)?.id).toBe(v7Like)
  })
})
