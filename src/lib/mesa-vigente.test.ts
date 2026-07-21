import { describe, expect, it } from 'vitest'

import { selecionarMesaVigente } from '@/lib/mesa-vigente'
import type { MesaDiretoraEntry } from '@/lib/queries/liderancas'

function entry(overrides: Partial<MesaDiretoraEntry> = {}): MesaDiretoraEntry {
  return {
    tipo: 'PRESIDENTE_MESA',
    casa: 'CAMARA',
    legislatura: 57,
    dataInicio: '2025-02-01',
    parlamentarId: 'p1',
    parlamentarNome: 'Hugo Motta',
    parlamentarPartidoSigla: 'REPUBLICANOS',
    parlamentarUf: 'PB',
    parlamentarUrlFoto: null,
    ...overrides,
  }
}

describe('selecionarMesaVigente', () => {
  it('remove o presidente do biênio anterior (caso Lira × Motta)', () => {
    const rows = [
      entry({
        parlamentarId: 'lira',
        parlamentarNome: 'Arthur Lira',
        dataInicio: '2023-02-01',
      }),
      entry({ parlamentarId: 'motta', dataInicio: '2025-02-01' }),
    ]
    const vigente = selecionarMesaVigente(rows)
    expect(vigente.map((r) => r.parlamentarId)).toEqual(['motta'])
  })

  it('mantém os N secretários da mesma coorte de posse', () => {
    const rows = [
      entry({ parlamentarId: 'pres', dataInicio: '2025-02-01' }),
      entry({
        parlamentarId: 's1',
        tipo: 'SECRETARIO_MESA',
        dataInicio: '2025-02-01',
      }),
      entry({
        parlamentarId: 's2',
        tipo: 'SECRETARIO_MESA',
        dataInicio: '2025-02-03',
      }),
      entry({
        parlamentarId: 's-antigo',
        tipo: 'SECRETARIO_MESA',
        dataInicio: '2023-02-01',
      }),
    ]
    const vigente = selecionarMesaVigente(rows)
    expect(vigente.map((r) => r.parlamentarId).sort()).toEqual([
      'pres',
      's1',
      's2',
    ])
  })

  it('descarta legislaturas anteriores por casa', () => {
    const rows = [
      entry({ parlamentarId: 'antigo', legislatura: 56 }),
      entry({ parlamentarId: 'atual', legislatura: 57 }),
    ]
    expect(selecionarMesaVigente(rows).map((r) => r.parlamentarId)).toEqual([
      'atual',
    ])
  })

  it('casas são independentes (coorte por casa)', () => {
    const rows = [
      entry({ parlamentarId: 'dep', casa: 'CAMARA', dataInicio: '2025-02-01' }),
      entry({
        parlamentarId: 'sen',
        casa: 'SENADO',
        legislatura: 56,
        dataInicio: '2023-02-01',
      }),
    ]
    // Senado só tem legislatura 56 → mantém; coorte da Câmara não interfere.
    expect(selecionarMesaVigente(rows)).toHaveLength(2)
  })

  it('linha sem dataInicio cai quando há linhas datadas na casa', () => {
    const rows = [
      entry({ parlamentarId: 'sem-data', dataInicio: null }),
      entry({ parlamentarId: 'com-data', dataInicio: '2025-02-01' }),
    ]
    expect(selecionarMesaVigente(rows).map((r) => r.parlamentarId)).toEqual([
      'com-data',
    ])
  })

  it('sem nenhuma linha datada, mantém tudo (não dá para decidir)', () => {
    const rows = [
      entry({ parlamentarId: 'a', dataInicio: null }),
      entry({
        parlamentarId: 'b',
        tipo: 'SECRETARIO_MESA',
        dataInicio: null,
      }),
    ]
    expect(selecionarMesaVigente(rows)).toHaveLength(2)
  })
})
