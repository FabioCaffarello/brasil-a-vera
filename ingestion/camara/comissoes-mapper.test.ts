import { describe, expect, it } from 'vitest'
import {
  dedupePorChaveNatural,
  isComissaoCamara,
  type MembroComissaoRow,
  mapMembroComissaoCamara,
  mapTipoParticipacaoCamara,
  truncarData,
} from './comissoes-mapper'
import type {
  CamaraDeputadoOrgao,
  CamaraOrgaoDetalhe,
} from './comissoes-schema'

const orgao: CamaraDeputadoOrgao = {
  idOrgao: 2003,
  siglaOrgao: 'CCJC',
  nomeOrgao: 'Comissão de Constituição e Justiça e de Cidadania',
  titulo: 'Titular',
  codTitulo: '101',
  dataInicio: '2026-03-05T00:00',
  dataFim: null,
}

const detalheComissao: CamaraOrgaoDetalhe = {
  id: 2003,
  sigla: 'CCJC',
  nome: 'Comissão de Constituição e Justiça e de Cidadania',
  codTipoOrgao: 2,
  tipoOrgao: 'Comissão Permanente',
}

const detalheGrupoTrabalho: CamaraOrgaoDetalhe = {
  id: 537507,
  sigla: 'GTCL',
  nome: 'Grupo de Trabalho de Consolidação das Leis',
  codTipoOrgao: 10,
  tipoOrgao: 'Grupo de Trabalho',
}

describe('isComissaoCamara (keep-by-default)', () => {
  it('mantém comissão permanente (2)', () => {
    expect(isComissaoCamara(2)).toBe(true)
  })
  it('mantém CPI (4), especial (3) e subcomissão (25)', () => {
    expect(isComissaoCamara(4)).toBe(true)
    expect(isComissaoCamara(3)).toBe(true)
    expect(isComissaoCamara(25)).toBe(true)
  })
  it('exclui grupo de trabalho (10), conselho (11) e plenário (26)', () => {
    expect(isComissaoCamara(10)).toBe(false)
    expect(isComissaoCamara(11)).toBe(false)
    expect(isComissaoCamara(26)).toBe(false)
  })
  it('exclui órgãos políticos: partido (101), bloco (102), governo (103)', () => {
    expect(isComissaoCamara(101)).toBe(false)
    expect(isComissaoCamara(102)).toBe(false)
    expect(isComissaoCamara(103)).toBe(false)
  })
  it('mantém um tipo desconhecido (anti-#481: não descarta em silêncio)', () => {
    expect(isComissaoCamara(99999)).toBe(true)
  })
})

describe('mapTipoParticipacaoCamara', () => {
  it('Suplente → SUPLENTE (case/espaço-insensível)', () => {
    expect(mapTipoParticipacaoCamara('Suplente')).toBe('SUPLENTE')
    expect(mapTipoParticipacaoCamara(' suplente ')).toBe('SUPLENTE')
  })
  it('Titular e papéis de liderança → TITULAR', () => {
    expect(mapTipoParticipacaoCamara('Titular')).toBe('TITULAR')
    expect(mapTipoParticipacaoCamara('Presidente')).toBe('TITULAR')
    expect(mapTipoParticipacaoCamara('1º Vice-Presidente')).toBe('TITULAR')
  })
  it('null → TITULAR', () => {
    expect(mapTipoParticipacaoCamara(null)).toBe('TITULAR')
  })
})

describe('truncarData', () => {
  it('corta o tempo do datetime ISO', () => {
    expect(truncarData('2026-03-05T00:00')).toBe('2026-03-05')
  })
  it('null/vazio → null', () => {
    expect(truncarData(null)).toBeNull()
    expect(truncarData('')).toBeNull()
  })
})

describe('mapMembroComissaoCamara', () => {
  it('mapeia comissão preservando sigla e cargo cru', () => {
    const row = mapMembroComissaoCamara(orgao, detalheComissao, 'uuid-1')
    expect(row).toEqual({
      parlamentarId: 'uuid-1',
      comissaoSourceId: '2003',
      comissaoNome: 'Comissão de Constituição e Justiça e de Cidadania',
      comissaoSigla: 'CCJC',
      cargoOrigem: 'Titular',
      tipoParticipacao: 'TITULAR',
      dataInicio: '2026-03-05',
      dataFim: null,
    })
  })

  it('preserva o papel de liderança em cargo_origem mas colapsa o enum', () => {
    const row = mapMembroComissaoCamara(
      { ...orgao, titulo: 'Presidente' },
      detalheComissao,
      'uuid-1',
    )
    expect(row?.cargoOrigem).toBe('Presidente')
    expect(row?.tipoParticipacao).toBe('TITULAR')
  })

  it('retorna null para órgão que não é comissão (grupo de trabalho)', () => {
    const row = mapMembroComissaoCamara(
      {
        ...orgao,
        idOrgao: 537507,
        siglaOrgao: 'GTCL',
        nomeOrgao: 'Grupo de Trabalho de Consolidação das Leis',
      },
      detalheGrupoTrabalho,
      'uuid-1',
    )
    expect(row).toBeNull()
  })

  it('retorna null quando falta dataInicio (coluna NOT NULL)', () => {
    const row = mapMembroComissaoCamara(
      { ...orgao, dataInicio: '' },
      detalheComissao,
      'uuid-1',
    )
    expect(row).toBeNull()
  })

  it('usa a sigla do detalhe quando a da lista vem nula', () => {
    const row = mapMembroComissaoCamara(
      { ...orgao, siglaOrgao: null },
      detalheComissao,
      'uuid-1',
    )
    expect(row?.comissaoSigla).toBe('CCJC')
  })
})

describe('dedupePorChaveNatural', () => {
  const base: MembroComissaoRow = {
    parlamentarId: 'u',
    comissaoSourceId: '2003',
    comissaoNome: 'CCJC',
    comissaoSigla: 'CCJC',
    cargoOrigem: 'Titular',
    tipoParticipacao: 'TITULAR',
    dataInicio: '2026-03-05',
    dataFim: null,
  }

  it('colapsa duplicatas por (source_id, data_inicio) mantendo a última', () => {
    const out = dedupePorChaveNatural([
      base,
      { ...base, dataFim: '2026-04-01' },
    ])
    expect(out).toHaveLength(1)
    expect(out[0].dataFim).toBe('2026-04-01')
  })

  it('preserva stints distintos do mesmo órgão (data_inicio diferente)', () => {
    const out = dedupePorChaveNatural([
      base,
      { ...base, dataInicio: '2024-02-01' },
    ])
    expect(out).toHaveLength(2)
  })
})
