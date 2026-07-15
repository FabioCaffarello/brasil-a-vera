import { describe, expect, it } from 'vitest'

import { normalizeNome } from './normalize'

describe('normalizeNome', () => {
  it('remove acentos, caixa e espaços redundantes', () => {
    expect(normalizeNome('São João del-Rei')).toBe('SAO JOAO DEL-REI')
    expect(normalizeNome('  Mogi das   Cruzes ')).toBe('MOGI DAS CRUZES')
    expect(normalizeNome('BELO HORIZONTE')).toBe('BELO HORIZONTE')
  })

  it('formas TSE e CGU do mesmo município convergem', () => {
    // Ambas as fontes emitem maiúsculas; divergência típica é acento.
    expect(normalizeNome('BRASÍLIA')).toBe(normalizeNome('BRASILIA'))
    expect(normalizeNome('AÇAILÂNDIA')).toBe(normalizeNome('ACAILANDIA'))
  })
})
