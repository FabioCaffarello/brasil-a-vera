// Tipos base que aparecem tanto na lista quanto em sub-objetos
type CamaraDeputadoBase = {
  id: number
  uri: string
  nome: string
  siglaPartido: string
  uriPartido: string | null
  siglaUf: string
  idLegislatura: number
  urlFoto: string
  email: string | null
}

// Resposta de GET /deputados (lista)
export type CamaraDeputado = CamaraDeputadoBase

// Resposta de GET /deputados/{id} (detalhe)
export type CamaraDeputadoDetalhes = {
  id: number
  uri: string
  nomeCivil: string
  cpf: string
  sexo: string
  urlWebsite: string | null
  redeSocial: string[]
  dataNascimento: string
  dataFalecimento: string | null
  ufNascimento: string
  municipioNascimento: string
  escolaridade: string
  ultimoStatus: {
    id: number
    uri: string
    nome: string
    siglaPartido: string
    uriPartido: string | null
    siglaUf: string
    idLegislatura: number
    urlFoto: string
    email: string | null
    data: string
    nomeEleitoral: string
    gabinete: {
      nome: string
      predio: string
      sala: string
      andar: string
      telefone: string
      email: string
    }
    situacao: string
    condicaoEleitoral: string
    descricaoStatus: string | null
  }
}

// Resposta de GET /votacoes (lista)
export type CamaraVotacaoResumo = {
  id: string
  uri: string
  data: string
  dataHoraRegistro: string | null
  siglaOrgao: string
  uriOrgao: string
  uriEvento: string | null
  proposicaoObjeto: string | null
  uriProposicaoObjeto: string | null
  descricao: string
  aprovacao: number
}

// Resposta de GET /votacoes/{id} (detalhe)
export type CamaraVotacaoDetalhe = CamaraVotacaoResumo & {
  descUltimaAberturaVotacao: string | null
  dataHoraUltimaAberturaVotacao: string | null
  ultimaApresentacaoProposicao: {
    dataHoraRegistro: string | null
    descricao: string | null
    uriProposicaoCitada: string | null
  } | null
  efeitosRegistrados: unknown[]
  objetosPossiveis: unknown[]
  proposicoesAfetadas: Array<{
    id: number
    uri: string
    siglaTipo: string
    codTipo: number
    numero: number
    ano: number
    ementa: string
    dataApresentacao: string
  }>
}

export type CamaraVoto = {
  tipoVoto: string
  dataRegistroVoto: string | null
  deputado_: CamaraDeputadoBase
}

export type CamaraOrientacao = {
  orientacao: string
  codTipoLideranca: string
  siglaPartidoBloco: string
  codPartidoBloco: number
  nomePublicacao: string
}

// Resposta de GET /deputados/{id}/orgaos
export type CamaraOrgaoDeputado = {
  idOrgao: number
  uriOrgao: string
  siglaOrgao: string
  nomeOrgao: string
  nomePublicacao: string
  titulo: string
  codTitulo: number
  dataInicio: string
  dataFim: string | null
}

// Resposta de GET /deputados/{id}/despesas
export type CamaraDespesa = {
  ano: number
  mes: number
  tipoDespesa: string
  codDocumento: number
  tipoDocumento: string
  codTipoDocumento: number
  dataDocumento: string
  numDocumento: string
  valorDocumento: number
  urlDocumento: string
  nomeFornecedor: string
  cnpjCpfFornecedor: string
  valorLiquido: number
  valorGlosa: number
  numRessarcimento: string
  codLote: number
  parcela: number
}

// Resposta de GET /deputados/{id}/frentes
export type CamaraFrenteDeputado = {
  id: number
  uri: string
  titulo: string
}

// Resposta de GET /partidos (lista)
export type CamaraPartido = {
  id: number
  sigla: string
  nome: string
}

export type CamaraResponse<T> = {
  dados: T
  links: Array<{ rel: string; href: string }>
}
