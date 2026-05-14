export interface ResultadoBusca {
  parlamentares: Array<{
    id: string
    nome: string
    casa: string
    partidoSigla: string
    uf: string
    urlFoto: string | null
  }>
  proposicoes: Array<{
    id: string
    tipo: string
    numero: number
    ano: number
    ementa: string
    situacao: string
  }>
  votacoes: Array<{
    id: string
    casa: string
    dataHora: Date | string
    descricao: string
    orgao: string
    aprovada: boolean
    votosSim: number
    votosNao: number
    abstencoes: number
  }>
  proposicaoMatchExato: { tipo: string; numero: number; ano: number } | null
}
