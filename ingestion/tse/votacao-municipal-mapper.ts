import type { TseVotacaoMunicipalRecord } from './votacao-municipal-schema'

// Mapper + agregador do colégio eleitoral municipal (ADR-065). Funções puras.
//
// O CSV do TSE é por candidato × município × ZONA eleitoral; o produto quer
// candidato × município (soma das zonas). O agregador também computa o TOTAL
// de votos do candidato no pleito (soma integral, antes do corte top-N) — é o
// denominador do % de concentração, gravado em tse_candidatura.qt_votos_nominais.

// CD_CARGO do TSE: 5 = Senador, 6 = Deputado Federal (mesma constante de bens.ts).
const CARGOS_FEDERAIS = new Set([5, 6])

// Persistimos o top-20 por candidatura (a UI exibe 5; 20 dá contexto de cauda
// sem inflar o banco — distribuição completa seria ~400k rows vs ~27k).
// Exportada para o disclaimer da UI ficar sincronizado com o cálculo.
export const TOP_MUNICIPIOS_PERSISTIDOS = 20

export interface VotoMunicipioRow {
  anoEleicao: number
  nrTurno: number
  sqCandidato: number
  cdCargo: number
  municipioTseCodigo: string
  municipioNome: string
  uf: string
  qtVotosNominais: number
}

// Forma canônica do CD_MUNICIPIO: 2014 traz zero à esquerda ("01120"), 2022
// não (1139). Sem normalização, o mesmo município viraria duas chaves.
export function normalizeCodigoMunicipio(codigo: string): string {
  const stripped = codigo.trim().replace(/^0+/, '')
  return stripped === '' ? '0' : stripped
}

export function mapVotoMunicipio(
  input: TseVotacaoMunicipalRecord,
): VotoMunicipioRow {
  return {
    anoEleicao: Number(input.ANO_ELEICAO),
    nrTurno: Number(input.NR_TURNO),
    sqCandidato: Number(input.SQ_CANDIDATO),
    cdCargo: Number(input.CD_CARGO),
    municipioTseCodigo: normalizeCodigoMunicipio(input.CD_MUNICIPIO),
    municipioNome: input.NM_MUNICIPIO,
    uf: input.SG_UF,
    qtVotosNominais: Number(input.QT_VOTOS_NOMINAIS),
  }
}

export interface MunicipioAgregado {
  municipioTseCodigo: string
  municipioNome: string
  uf: string
  qtVotosNominais: number
}

export interface CandidatoAgregado {
  sqCandidato: number
  /** Soma integral de todos os municípios do pleito (denominador do %). */
  totalVotos: number
  /** Top-N municípios por votos, desc; empate por nome asc (determinístico). */
  municipios: MunicipioAgregado[]
}

export interface VotoAggregator {
  /** @returns true se a linha entrou na agregação (passou os filtros). */
  add(row: VotoMunicipioRow): boolean
  snapshot(): CandidatoAgregado[]
}

// Agrega em memória apenas os candidatos vinculados (~centenas de SQs), com
// filtros de ano, turno 1 e cargo federal. Memória proporcional a candidatos
// vinculados × municípios com voto — não ao tamanho do CSV.
export function createVotoAggregator(
  ano: number,
  sqsVinculados: ReadonlySet<number>,
  topN: number = TOP_MUNICIPIOS_PERSISTIDOS,
): VotoAggregator {
  const porCandidato = new Map<number, Map<string, MunicipioAgregado>>()

  const add = (row: VotoMunicipioRow): boolean => {
    if (row.anoEleicao !== ano) return false
    if (row.nrTurno !== 1) return false
    if (!CARGOS_FEDERAIS.has(row.cdCargo)) return false
    if (!sqsVinculados.has(row.sqCandidato)) return false

    let municipios = porCandidato.get(row.sqCandidato)
    if (!municipios) {
      municipios = new Map()
      porCandidato.set(row.sqCandidato, municipios)
    }
    const existente = municipios.get(row.municipioTseCodigo)
    if (existente) {
      // Zonas do mesmo município somam; nome/UF são idênticos por construção.
      existente.qtVotosNominais += row.qtVotosNominais
    } else {
      municipios.set(row.municipioTseCodigo, {
        municipioTseCodigo: row.municipioTseCodigo,
        municipioNome: row.municipioNome,
        uf: row.uf,
        qtVotosNominais: row.qtVotosNominais,
      })
    }
    return true
  }

  const snapshot = (): CandidatoAgregado[] => {
    const resultado: CandidatoAgregado[] = []
    for (const [sqCandidato, municipios] of porCandidato) {
      let totalVotos = 0
      for (const m of municipios.values()) {
        totalVotos += m.qtVotosNominais
      }
      const ordenados = [...municipios.values()].sort(
        (a, b) =>
          b.qtVotosNominais - a.qtVotosNominais ||
          a.municipioNome.localeCompare(b.municipioNome),
      )
      resultado.push({
        sqCandidato,
        totalVotos,
        municipios: ordenados.slice(0, topN),
      })
    }
    return resultado.sort((a, b) => a.sqCandidato - b.sqCandidato)
  }

  return { add, snapshot }
}
