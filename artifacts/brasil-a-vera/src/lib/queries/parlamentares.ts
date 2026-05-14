export type Casa = 'CAMARA' | 'SENADO'

export interface FiltrosParlamentar {
  casa?: Casa
  partido?: string
  uf?: string
}

export const TOP5_JANELA_MESES = 12
export const TOP5_QUORUM_MINIMO = 20

export interface AfinidadeVoto {
  parlamentarId: string
  nome: string
  partidoSigla: string
  uf: string
  casa: string
  urlFoto: string | null
  votosCoincidentes: number
  totalVotosEmComum: number
  percentualAfinidade: number
}

export interface GastoCategoria {
  categoriaDescricao: string
  total: string
  n: number
}

export interface GastosResumo {
  totalGeral: string
  totalRegistros: number
  porCategoria: GastoCategoria[]
  ano: number
}
