import { describe, expect, it } from 'vitest'

import {
  buildGrafoParticipacao,
  extrairCnpj,
  formatarCnpj,
  type GrafoRow,
} from './grafo'

function row(over: Partial<GrafoRow>): GrafoRow {
  return {
    anoEleicao: 2022,
    cdTipoBem: 32,
    dsTipoBem: 'Quotas ou quinhões de capital',
    dsBem: '',
    valor: '0.00',
    ...over,
  }
}

describe('extrairCnpj', () => {
  it('CNPJ formatado', () => {
    expect(
      extrairCnpj('10% DO CAPITAL SOCIAL DO CNPJ 08.993.224/0001-53'),
    ).toBe('08993224000153')
  })
  it('CNPJ com / mas sem pontos', () => {
    expect(extrairCnpj('EMPRESA X CNPJ:05983662/0001-42(INATIVA')).toBe(
      '05983662000142',
    )
  })
  it('CNPJ cru de 14 dígitos', () => {
    expect(extrairCnpj('RADIODIFUSAO LTDA CNPJ-02386806000195')).toBe(
      '02386806000195',
    )
  })
  it('sem CNPJ → null; não casa número curto', () => {
    expect(extrairCnpj('18000 QUOTAS EMPRESA TELECENTER LTDA')).toBeNull()
    expect(extrairCnpj('CAPITAL SOCIAL DA EMPRESA MAGDA')).toBeNull()
  })
  it('não casa dentro de um número maior que 14 dígitos', () => {
    expect(extrairCnpj('valor 123456789012345678')).toBeNull()
  })
})

describe('formatarCnpj', () => {
  it('formata 14 dígitos', () => {
    expect(formatarCnpj('08993224000153')).toBe('08.993.224/0001-53')
  })
})

describe('buildGrafoParticipacao', () => {
  it('null sem participações', () => {
    expect(buildGrafoParticipacao([])).toBeNull()
  })

  it('agrupa pelo mesmo CNPJ entre pleitos (nó resolvido)', () => {
    const g = buildGrafoParticipacao([
      row({
        anoEleicao: 2018,
        dsBem: 'QUOTAS DA CDC NUCLEAR CNPJ 15.463.090/0001-24',
        valor: '1000.00',
      }),
      row({
        anoEleicao: 2022,
        dsBem: 'CDC NUCLEAR S/S CNPJ 15.463.090/0001-24',
        valor: '3000.00',
      }),
    ])
    expect(g?.totalEmpresas).toBe(1)
    expect(g?.nResolvidas).toBe(1)
    const e = g?.empresas[0]
    expect(e?.cnpj).toBe('15463090000124')
    expect(e?.resolvido).toBe(true)
    expect(e?.totalDeclarado).toBe('4000.00')
    expect(e?.participacoes.map((p) => p.ano)).toEqual([2018, 2022])
  })

  it('empresa sem CNPJ vira nó não-resolvido, nunca fundido por similaridade', () => {
    const g = buildGrafoParticipacao([
      row({
        dsBem: 'CAPITAL SOCIAL DA EMPRESA MAGDA MOFATTO',
        valor: '500.00',
      }),
      row({
        dsBem: 'CAPITAL SOCIAL DA EMPRESA MAGDA MOFATTÃO',
        valor: '500.00',
      }),
    ])
    // Descrições diferentes (não fundimos por similaridade) → 2 nós.
    expect(g?.totalEmpresas).toBe(2)
    expect(g?.nResolvidas).toBe(0)
    expect(g?.empresas.every((e) => !e.resolvido)).toBe(true)
  })

  it('ordena empresas por total declarado desc', () => {
    const g = buildGrafoParticipacao([
      row({ dsBem: 'A CNPJ 11.111.111/1111-11', valor: '100.00' }),
      row({ dsBem: 'B CNPJ 22.222.222/2222-22', valor: '900.00' }),
    ])
    expect(g?.empresas.map((e) => e.cnpj)).toEqual([
      '22222222222222',
      '11111111111111',
    ])
  })
})
