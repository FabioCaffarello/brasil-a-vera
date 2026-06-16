import { describe, expect, it } from 'vitest'

import { mapDeputadoDetalheCpf, normalizeCpf } from './cpf-mapper'

describe('normalizeCpf', () => {
  it('mantém 11 dígitos limpos', () => {
    expect(normalizeCpf('74287028287')).toBe('74287028287')
  })

  it('remove pontuação e mantém 11 dígitos', () => {
    expect(normalizeCpf('742.870.282-87')).toBe('74287028287')
  })

  it('rejeita comprimento != 11 → null', () => {
    expect(normalizeCpf('123')).toBeNull()
    expect(normalizeCpf('123456789012')).toBeNull()
  })

  it('rejeita sentinelas do TSE (-1, -4) → null', () => {
    expect(normalizeCpf('-1')).toBeNull()
    expect(normalizeCpf('-4')).toBeNull()
  })

  it('trata null/undefined/vazio → null', () => {
    expect(normalizeCpf(null)).toBeNull()
    expect(normalizeCpf(undefined)).toBeNull()
    expect(normalizeCpf('')).toBeNull()
  })
})

describe('mapDeputadoDetalheCpf', () => {
  it('extrai sourceId e cpf normalizado do envelope de detalhe', () => {
    expect(
      mapDeputadoDetalheCpf({
        dados: { id: '204379', cpf: '74287028287', nomeCivil: 'FULANO' },
      }),
    ).toEqual({ sourceId: '204379', cpf: '74287028287' })
  })

  it('cpf ausente vira null (não-vinculável)', () => {
    expect(mapDeputadoDetalheCpf({ dados: { id: '999', cpf: null } })).toEqual({
      sourceId: '999',
      cpf: null,
    })
  })
})
