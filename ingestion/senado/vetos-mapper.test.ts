import { describe, expect, it } from 'vitest'
import { mapDispositivos, mapVetos, mapVotosSenado } from './vetos-mapper'
import {
  listaVetosAnoSchema,
  resultadoVetoDispositivoSchema,
  resultadoVetoMateriaSchema,
} from './vetos-schema'

// Fixtures derivadas da resposta real da API (probe 2026-06-24, princípio 13).
// GET /materia/vetos/2024 e GET /plenario/resultado/veto/dispositivo/42594

const fixtureListaVetos = {
  ListaVetosAnoCN: {
    Metadados: { Versao: '01/06/2026 01:21:04', VersaoServico: '7' },
    Vetos: {
      Veto: [
        {
          Codigo: '17011',
          Materia: {
            Codigo: '166968',
            SiglaCasa: 'CN',
            Sigla: 'VET',
            Numero: '50',
            Ano: '2024',
            EmTramitacao: 'Sim',
            Ementa:
              'Veto parcial aposto ao Projeto de Lei nº 3.149 de 2020, que altera a Lei nº 13.576.',
          },
          MateriaVetada: {
            Sigla: 'PL',
            Numero: '3149',
            Ano: '2020',
            Ementa: 'Altera a Lei nº 13.576, de 26 de dezembro de 2017.',
          },
          Total: 'Não',
          Assunto: 'Créditos de Descarbonização',
          DataPublicacao: '2024-12-31',
          DataRecebimentoCongresso: '2025-01-02',
          SobrestandoPauta: 'Sim',
        },
        {
          Codigo: '17010',
          Materia: {
            Codigo: '166965',
            Sigla: 'VET',
            Numero: '49',
            Ano: '2024',
            EmTramitacao: 'Não',
            Ementa:
              'Veto parcial aposto ao Projeto de Lei da Câmara nº 64 de 2016.',
          },
          MateriaVetada: {
            Sigla: 'PLC',
            Numero: '64',
            Ano: '2016',
            Ementa: 'Altera a Lei nº 11.977, de 7 de julho de 2009.',
          },
          Total: 'Não',
          Assunto: 'Programa Nacional de Habitação Urbana - PNHU',
          DataPublicacao: '2024-12-31',
          DataRecebimentoCongresso: '2025-01-02',
          SobrestandoPauta: 'Não',
        },
      ],
    },
  },
}

const fixtureResultadoMateria = {
  ResultadoVetoMateriaCN: {
    Metadados: { Versao: '24/06/2026 02:52:04' },
    Veto: {
      Codigo: '17010',
      Materia: { Codigo: '166965', EmTramitacao: 'Não' },
      MateriaVetada: { Sigla: 'PLC', Numero: '64', Ano: '2016' },
      Dispositivos: {
        Dispositivo: [
          {
            Codigo: '45251',
            Identificador: '49.24.001',
            Descricao:
              '"caput" do art. 4º da Lei nº 11.977, de 7 de julho de 2009.',
            Assunto: 'Objetivos do PNHU',
            Situacao: 'Mantido',
            PossuiVotos: 'Sim',
            TipoVotacao: 'Cédula',
            DataSessao: '2025-06-17',
          },
          {
            Codigo: '45252',
            Identificador: '49.24.002',
            Descricao: 'Art. 5º do projeto.',
            Assunto: 'Regularização fundiária',
            Situacao: 'Mantido',
            PossuiVotos: 'Sim',
            TipoVotacao: 'Cédula',
            DataSessao: '2025-06-17',
          },
        ],
      },
    },
  },
}

const fixtureResultadoDispositivo = {
  ResultadoVetoDispositivoCN: {
    Metadados: { Versao: '24/06/2026 02:52:43' },
    Votacao: {
      ParteVetada: '"caput" do art. 4º',
      TipoVotacao: 'Cédula',
      Sessao: 'Sessão Conjunta nº 13 de 17/06/2025 às 12:00h',
      Camara: {
        Voto: [
          {
            NomeParlamentar: 'Acácio Favacho',
            PartidoParlamentar: 'MDB',
            UfParlamentar: 'AP',
            TipoVoto: 'Sim',
          },
          {
            NomeParlamentar: 'Adail Filho',
            PartidoParlamentar: 'REPUBLICANOS',
            UfParlamentar: 'AM',
            TipoVoto: 'Sim',
          },
        ],
      },
      Senado: {
        Voto: [
          {
            NomeParlamentar: 'Alan Rick',
            PartidoParlamentar: 'UNIÃO',
            UfParlamentar: 'AC',
            TipoVoto: 'Não',
          },
          {
            NomeParlamentar: 'Alessandro Vieira',
            PartidoParlamentar: 'MDB',
            UfParlamentar: 'SE',
            TipoVoto: 'Não',
          },
          {
            NomeParlamentar: 'Ciro Nogueira',
            PartidoParlamentar: 'PP',
            UfParlamentar: 'PI',
            TipoVoto: 'Sim',
          },
        ],
      },
    },
  },
}

// Fixture: Senado vazio (ocorre quando apenas Câmara votou — probe em 17011)
const fixtureDispositivoSenadoVazio = {
  ResultadoVetoDispositivoCN: {
    Votacao: {
      TipoVotacao: 'Cédula',
      Sessao: 'Sessão Conjunta nº X',
      Camara: { Voto: [{ NomeParlamentar: 'Dep. X', TipoVoto: 'Sim' }] },
      Senado: {},
    },
  },
}

// Fixture: veto único (objeto, não array) — XML-to-JSON com 1 elemento
const fixtureListaVetoSingular = {
  ListaVetosAnoCN: {
    Vetos: {
      Veto: {
        Codigo: '9999',
        Materia: {
          Codigo: '111111',
          Numero: '1',
          Ano: '2023',
          EmTramitacao: 'Sim',
          Ementa: 'Veto singular de teste.',
        },
        Total: 'Sim',
        Assunto: 'Teste veto total',
        DataPublicacao: '2023-06-01',
        DataRecebimentoCongresso: '2023-06-15',
      },
    },
  },
}

describe('listaVetosAnoSchema', () => {
  it('parseia lista com array de vetos', () => {
    const result = listaVetosAnoSchema.safeParse(fixtureListaVetos)
    expect(result.success).toBe(true)
    const vetos = result.data?.ListaVetosAnoCN.Vetos?.Veto ?? []
    expect(vetos).toHaveLength(2)
    expect(vetos[0].Codigo).toBe('17011')
    expect(vetos[1].Materia.EmTramitacao).toBe('Não')
  })

  it('normaliza veto singular (objeto → array)', () => {
    const result = listaVetosAnoSchema.safeParse(fixtureListaVetoSingular)
    expect(result.success).toBe(true)
    const vetos = result.data?.ListaVetosAnoCN.Vetos?.Veto ?? []
    expect(vetos).toHaveLength(1)
    expect(vetos[0].Codigo).toBe('9999')
  })
})

describe('resultadoVetoMateriaSchema', () => {
  it('parseia dispositivos da matéria', () => {
    const result = resultadoVetoMateriaSchema.safeParse(fixtureResultadoMateria)
    expect(result.success).toBe(true)
    const disps =
      result.data?.ResultadoVetoMateriaCN.Veto.Dispositivos?.Dispositivo ?? []
    expect(disps).toHaveLength(2)
    expect(disps[0].Codigo).toBe('45251')
    expect(disps[0].Situacao).toBe('Mantido')
    expect(disps[0].PossuiVotos).toBe('Sim')
  })
})

describe('resultadoVetoDispositivoSchema', () => {
  it('parseia votos Câmara e Senado', () => {
    const result = resultadoVetoDispositivoSchema.safeParse(
      fixtureResultadoDispositivo,
    )
    expect(result.success).toBe(true)
    const camara =
      result.data?.ResultadoVetoDispositivoCN.Votacao?.Camara?.Voto ?? []
    const senado =
      result.data?.ResultadoVetoDispositivoCN.Votacao?.Senado?.Voto ?? []
    expect(camara).toHaveLength(2)
    expect(senado).toHaveLength(3)
  })

  it('aceita Senado vazio {}', () => {
    const result = resultadoVetoDispositivoSchema.safeParse(
      fixtureDispositivoSenadoVazio,
    )
    expect(result.success).toBe(true)
    const senado =
      result.data?.ResultadoVetoDispositivoCN.Votacao?.Senado?.Voto ?? []
    expect(senado).toHaveLength(0)
  })
})

describe('mapVetos', () => {
  it('mapeia lista de vetos corretamente', () => {
    const parsed = listaVetosAnoSchema.parse(fixtureListaVetos)
    const rows = mapVetos(parsed)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      sourceId: '17011',
      materiaCodigo: '166968',
      numero: '50',
      ano: 2024,
      vetoTotal: false,
      assunto: 'Créditos de Descarbonização',
      emTramitacao: true,
      dataPublicacao: '2024-12-31',
    })
    expect(rows[1].emTramitacao).toBe(false)
    expect(rows[1].materiaVetadaSigla).toBe('PLC')
  })

  it('mapeia veto total (Total=Sim)', () => {
    const parsed = listaVetosAnoSchema.parse(fixtureListaVetoSingular)
    const rows = mapVetos(parsed)
    expect(rows[0].vetoTotal).toBe(true)
    expect(rows[0].emTramitacao).toBe(true)
  })
})

describe('mapDispositivos', () => {
  it('mapeia dispositivos da matéria', () => {
    const parsed = resultadoVetoMateriaSchema.parse(fixtureResultadoMateria)
    const rows = mapDispositivos(parsed)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      sourceId: '45251',
      identificador: '49.24.001',
      situacao: 'Mantido',
      tipoVotacao: 'Cédula',
      dataSessao: '2025-06-17',
      possuiVotos: true,
    })
  })
})

describe('mapVotosSenado', () => {
  it('mapeia votos do Senado com normalização', () => {
    const parsed = resultadoVetoDispositivoSchema.parse(
      fixtureResultadoDispositivo,
    )
    const rows = mapVotosSenado(parsed)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({
      nomeRaw: 'Alan Rick',
      partidoRaw: 'UNIÃO',
      ufRaw: 'AC',
      voto: 'NAO',
    })
    expect(rows[2].voto).toBe('SIM')
  })

  it('retorna [] quando Senado vazio', () => {
    const parsed = resultadoVetoDispositivoSchema.parse(
      fixtureDispositivoSenadoVazio,
    )
    expect(mapVotosSenado(parsed)).toHaveLength(0)
  })
})
