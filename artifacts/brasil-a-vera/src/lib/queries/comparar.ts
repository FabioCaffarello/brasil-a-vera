export interface ParlamentarComparar {
  id: string
  nome: string
  casa: 'CAMARA' | 'SENADO'
  partidoSigla: string
  uf: string
  urlFoto: string | null
}

export interface CategoriaGasto {
  categoriaDescricao: string
  total: string
  n: number
}

export interface MetricasParlamentar {
  parlamentarId: string
  presenca: {
    presente: number
    total: number
    percentual: number | null
  }
  gastosTotalGeral: string
  gastosTotalRegistros: number
  gastosTopCategorias: CategoriaGasto[]
  proposicoesAutoriaPrimaria: number
}

export interface ConcordanciaPar {
  a: string
  b: string
  votosEmComum: number
  coincidentes: number
  percentual: number | null
}

export interface CompararResult {
  parlamentares: ParlamentarComparar[]
  metricas: MetricasParlamentar[]
  concordancia: ConcordanciaPar[]
  ano: number
}
