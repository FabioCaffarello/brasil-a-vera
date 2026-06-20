import { describe, expect, it } from 'vitest'

import { mapDiscursosCamara } from './discursos-mapper'

describe('mapDiscursosCamara', () => {
  it('mapeia metadados e descarta transcrição', () => {
    const r = mapDiscursosCamara([
      {
        dataHoraInicio: '2026-05-13T20:00',
        tipoDiscurso: 'BREVES COMUNICAÇÕES',
        faseEvento: { titulo: 'Breves Comunicações' },
        sumario: 'Defendeu os Agentes Comunitários de Saúde.',
        keywords: 'PEC,Aposentadoria especial',
        urlTexto: null,
        // @ts-expect-error transcricao não faz parte do tipo persistido
        transcricao: 'O SR. ... (texto longo inteiro) ...',
      },
    ])
    expect(r).toEqual([
      {
        sourceId: null,
        data: '2026-05-13T20:00',
        tipo: 'BREVES COMUNICAÇÕES',
        sumario: 'Defendeu os Agentes Comunitários de Saúde.',
        keywords: 'PEC,Aposentadoria especial',
        urlTexto: null,
      },
    ])
    // garante que transcrição não vazou
    expect('transcricao' in r[0]).toBe(false)
  })

  it('usa faseEvento.titulo como fallback de tipo e default final', () => {
    const r = mapDiscursosCamara([
      {
        dataHoraInicio: '2025-01-01T10:00',
        faseEvento: { titulo: 'Ordem do Dia' },
      },
      { dataHoraInicio: '2025-01-02T10:00' },
    ])
    expect(r[0].tipo).toBe('Ordem do Dia')
    expect(r[1].tipo).toBe('Discurso')
  })

  it('normaliza vazios para null e ignora discurso sem data', () => {
    const r = mapDiscursosCamara([
      { dataHoraInicio: '', sumario: 'x' },
      { dataHoraInicio: '2025-03-01T10:00', sumario: '  ', keywords: '' },
    ])
    expect(r).toHaveLength(1)
    expect(r[0].sumario).toBeNull()
    expect(r[0].keywords).toBeNull()
  })
})
