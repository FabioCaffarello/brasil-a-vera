import { describe, expect, it } from 'vitest'

import { agruparVetosPorVeto } from '@/lib/agrupar-vetos'
import type { VetoPorSenador } from '@/lib/queries/vetos'

function row(overrides: Partial<VetoPorSenador> = {}): VetoPorSenador {
  return {
    vetoId: 'veto-1',
    vetoNumero: '29',
    vetoAno: 2025,
    vetoEmenta: 'Veto parcial ao PL 2.159/2021',
    dispositivoId: 'disp-1',
    dispositivoIdentificador: '29.25.001',
    situacao: 'Rejeitado',
    dataSessao: '2025-11-27',
    voto: 'NAO',
    ...overrides,
  }
}

describe('agruparVetosPorVeto', () => {
  it('retorna vazio para entrada vazia', () => {
    expect(agruparVetosPorVeto([])).toEqual([])
  })

  it('agrupa dispositivos do mesmo veto em um único item', () => {
    const rows = [
      row({ dispositivoId: 'd1', voto: 'NAO' }),
      row({ dispositivoId: 'd2', voto: 'NAO' }),
      row({ dispositivoId: 'd3', voto: 'SIM', situacao: 'Mantido' }),
      row({ dispositivoId: 'd4', voto: 'ABSTENCAO', situacao: null }),
    ]
    const grupos = agruparVetosPorVeto(rows)

    expect(grupos).toHaveLength(1)
    const g = grupos[0]
    expect(g?.dispositivosTotal).toBe(4)
    expect(g?.votosSim).toBe(1)
    expect(g?.votosNao).toBe(2)
    expect(g?.votosOutros).toBe(1)
    expect(g?.situacoes).toEqual({
      mantidos: 1,
      derrubados: 2,
      emTramitacao: 1,
    })
  })

  it('separa vetos distintos preservando a ordem de chegada', () => {
    const rows = [
      row({ vetoId: 'veto-b', vetoNumero: '31' }),
      row({ vetoId: 'veto-a', vetoNumero: '12', dispositivoId: 'd2' }),
      row({ vetoId: 'veto-b', vetoNumero: '31', dispositivoId: 'd3' }),
    ]
    const grupos = agruparVetosPorVeto(rows)

    expect(grupos.map((g) => g.vetoId)).toEqual(['veto-b', 'veto-a'])
    expect(grupos[0]?.dispositivosTotal).toBe(2)
    expect(grupos[1]?.dispositivosTotal).toBe(1)
  })

  it('usa a data de sessão mais recente e tolera nulls', () => {
    const rows = [
      row({ dispositivoId: 'd1', dataSessao: '2025-11-27' }),
      row({ dispositivoId: 'd2', dataSessao: null }),
      row({ dispositivoId: 'd3', dataSessao: '2026-02-10' }),
    ]
    expect(agruparVetosPorVeto(rows)[0]?.dataSessao).toBe('2026-02-10')
  })
})
