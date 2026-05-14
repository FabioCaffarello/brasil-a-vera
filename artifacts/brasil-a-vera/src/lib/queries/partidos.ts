export interface PartidoMembro {
  id: string
  nome: string
  casa: 'CAMARA' | 'SENADO'
  uf: string
  urlFoto: string | null
}

export interface PartidoOverview {
  sigla: string
  nomeOficial: string | null
  totalParlamentares: number
  parlamentares: PartidoMembro[]
}

export interface FidelidadeInternaMedia {
  percentualMedio: number | null
  parlamentaresElegiveis: number
  parlamentaresTotal: number
}

export interface TemaContagem {
  nomeTema: string
  contagem: number
}

export interface GastoBancada {
  totalGeral: string
  totalRegistros: number
}
