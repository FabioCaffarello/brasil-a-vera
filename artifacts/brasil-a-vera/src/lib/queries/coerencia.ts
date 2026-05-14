export interface ParContraditorio {
  tema: string
  voto1: {
    votacaoId: string
    votacaoDescricao: string
    dataHora: Date | string
    proposicaoTipo: string
    proposicaoNumero: number
    proposicaoAno: number
    ementa: string
    direcao: string
    voto: string
  }
  voto2: {
    votacaoId: string
    votacaoDescricao: string
    dataHora: Date | string
    proposicaoTipo: string
    proposicaoNumero: number
    proposicaoAno: number
    ementa: string
    direcao: string
    voto: string
  }
  diasEntreVotos: number
}

export interface CoerenciaStats {
  votosClassificados: number
  votosTotaisComProposicao: number
  paresContraditoriosDetectados: number
}
