import { describe, expect, it } from 'vitest'

import { mapCamaraGasto } from './gastos-mapper'

describe('mapCamaraGasto', () => {
  const baseInput = {
    ano: 2025,
    mes: 7,
    tipoDespesa: 'MANUTENÇÃO DE ESCRITÓRIO',
    codDocumento: '7950433',
    tipoDocumento: 'Nota Fiscal',
    codTipoDocumento: 0,
    dataDocumento: '2025-07-16T00:00:00',
    valorDocumento: 997.5,
    urlDocumento: 'https://example.com/doc.pdf',
    nomeFornecedor: 'EMPRESA EXEMPLO LTDA',
    cnpjCpfFornecedor: '48949641000113',
    valorGlosa: 0,
  }

  it('mapeia o payload da Câmara para GastoRow', () => {
    const row = mapCamaraGasto(baseInput, 'uuid-parl-1', '160541')
    expect(row).toEqual({
      sourceId: '7950433',
      parlamentarId: 'uuid-parl-1',
      tipo: 'CEAP',
      categoriaCodigo: 0,
      categoriaDescricao: 'MANUTENÇÃO DE ESCRITÓRIO',
      fornecedorNome: 'EMPRESA EXEMPLO LTDA',
      fornecedorCnpjCpf: '48949641000113',
      valor: '997.5',
      valorGlosa: '0',
      dataEmissao: '2025-07-16',
      urlDocumento: 'https://example.com/doc.pdf',
      trustLevel: 'L1',
      sourceUrl:
        'https://dadosabertos.camara.leg.br/api/v2/deputados/160541/despesas',
    })
  })

  it('preserva precisão decimal convertendo number → string', () => {
    const row = mapCamaraGasto(
      { ...baseInput, valorDocumento: 1234.56 },
      'u',
      '1',
    )
    expect(row.valor).toBe('1234.56')
  })

  it('valor_glosa null quando ausente', () => {
    const row = mapCamaraGasto({ ...baseInput, valorGlosa: null }, 'u', '1')
    expect(row.valorGlosa).toBeNull()
  })

  it('cnpjCpf null quando ausente', () => {
    const row = mapCamaraGasto(
      { ...baseInput, cnpjCpfFornecedor: null },
      'u',
      '1',
    )
    expect(row.fornecedorCnpjCpf).toBeNull()
  })

  it('corta tempo do dataDocumento', () => {
    const row = mapCamaraGasto(baseInput, 'u', '1')
    expect(row.dataEmissao).toBe('2025-07-16')
  })
})
