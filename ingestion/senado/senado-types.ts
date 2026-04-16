// Helper para campos que a API do Senado pode retornar como T ou T[]
// (a API serializa array de 1 elemento como objeto único)
type ArrayOrSingle<T> = T | T[]

export type SenadoMetadados = {
  Versao?: string
  VersaoServico?: string
  DataVersaoServico?: string
  DescricaoDataSet?: string
}

// --- GET /senador/lista/atual.json ---

export type SenadoListaSenadoresResponse = {
  ListaParlamentarEmExercicio: {
    Metadados?: SenadoMetadados
    Parlamentares: {
      Parlamentar: ArrayOrSingle<SenadoParlamentarResumo>
    }
  }
}

export type SenadoParlamentarResumo = {
  IdentificacaoParlamentar: SenadoIdentificacaoParlamentar
  Mandato?: SenadoMandato
}

export type SenadoIdentificacaoParlamentar = {
  CodigoParlamentar: string
  CodigoPublicoNaLegAtual?: string
  NomeParlamentar: string
  NomeCompletoParlamentar: string
  SexoParlamentar: string
  FormaTratamento?: string
  UrlFotoParlamentar: string
  UrlPaginaParlamentar?: string
  EmailParlamentar?: string
  SiglaPartidoParlamentar: string
  UfParlamentar: string
}

export type SenadoMandato = {
  CodigoMandato: string
  UfParlamentar: string
  PrimeiraLegislaturaDoMandato?: SenadoLegislatura
  SegundaLegislaturaDoMandato?: SenadoLegislatura
  DescricaoParticipacao: string
}

export type SenadoLegislatura = {
  NumeroLegislatura: string
  DataInicio: string
  DataFim: string
}

// --- GET /dados/ListaVotacoes{ano}.json ---
// Estrutura confirmada via curl da API real (campos da Materia vêm FLAT na Votacao,
// não aninhados em um objeto Materia, e não há totalizadores)

export type SenadoListaVotacoesResponse = {
  ListaVotacoes: {
    Metadados?: SenadoMetadados
    Votacoes?: {
      Votacao: ArrayOrSingle<SenadoVotacao>
    }
  }
}

export type SenadoVotacao = {
  CodigoSessao: string
  CodigoSessaoVotacao: string
  SiglaCasa: string
  CodigoSessaoLegislativa?: string
  TipoSessao?: string
  NumeroSessao?: string
  DataSessao: string // YYYY-MM-DD
  HoraInicio: string | null // HH:MM ou HH:MM:SS
  CodigoVotacaoSve?: string
  SequencialSessao?: string
  Secreta: 'S' | 'N'
  DescricaoVotacao: string
  Resultado: string // "A" | "R" | "P" | outros
  // Campos da matéria vêm flat (não aninhados em Materia)
  CodigoMateria?: string
  SiglaMateria?: string
  NumeroMateria?: string
  AnoMateria?: string
  SiglaCasaMateria?: string
  DescricaoObjetivoProcesso?: string
  DescricaoIdentificacaoMateria?: string
  Votos?: {
    VotoParlamentar: ArrayOrSingle<SenadoVotoParlamentar>
  }
}

export type SenadoVotoParlamentar = {
  CodigoParlamentar: string
  NomeParlamentar: string
  SexoParlamentar?: string
  SiglaPartido: string
  SiglaUF: string
  Url?: string
  Foto?: string
  Tratamento?: string
  Voto: string // "Sim" | "Não" | "Abstenção" | "P-NRV" | "MIS" | "NCom" | "LP" | "AP" | "Obstrução" | etc.
}

// --- GET /senador/{codigo}/historico.json ---

export type SenadoDetalheParlamentarResponse = {
  DetalheParlamentar: {
    Metadados?: SenadoMetadados
    Parlamentar: {
      IdentificacaoParlamentar: SenadoIdentificacaoParlamentar
      DadosBasicosParlamentar?: SenadoDadosBasicos
      Telefones?: unknown
      OutrasInformacoes?: unknown
    }
  }
}

export type SenadoDadosBasicos = {
  DataNascimento?: string // YYYY-MM-DD
  Naturalidade?: string
  UfNaturalidade?: string
  EnderecoParlamentar?: string
}

// --- GET /senador/{codigo}/comissoes.json ---
// Estrutura real (verificada via curl):
// MembroComissaoParlamentar.Parlamentar.MembroComissoes.Comissao[]  (note: "MembroComissoes" plural)
// Datas estão em formato ISO YYYY-MM-DD (NÃO YYYYMMDD).
// DescricaoParticipacao vem em Title Case ("Titular", "Suplente").

export type SenadoComissoesResponse = {
  MembroComissaoParlamentar: {
    Metadados?: SenadoMetadados
    Parlamentar?: {
      Codigo?: string
      Nome?: string
      MembroComissoes?: {
        Comissao: ArrayOrSingle<SenadoComissaoMembro>
      }
    }
  }
}

export type SenadoComissaoMembro = {
  IdentificacaoComissao: {
    CodigoComissao: string
    SiglaComissao: string
    NomeComissao: string
    SiglaCasaComissao: string // 'SF' (Senado), 'CN' (Congresso)
  }
  DescricaoParticipacao: string // 'Titular' | 'Suplente' | 'Presidente' | 'Vice-Presidente' | etc.
  DataInicio: string // YYYY-MM-DD
  DataFim?: string // YYYY-MM-DD (ausente para participações ativas)
}

// --- GET /materia/atualizadas?numdias=N ---
// Estrutura confirmada via curl da API real (16/04/2026).
// IMPORTANTE: este endpoint está em depreciação programada (ver Metadados.Descontinuacao).
// Para Wave 1 ele basta; em Wave 2 migrar para /processo (substituto oficial).

export type SenadoListaMateriasAtualizadasResponse = {
  ListaMateriasAtualizadas: {
    Metadados?: SenadoMetadados & {
      Descontinuacao?: {
        DataDepreciacao?: string
        DataDesativacaoCompleta?: string
        UrlServicoSubstituto?: string
      }
    }
    Materias?: {
      Materia: ArrayOrSingle<SenadoMateriaAtualizada>
    }
  }
}

export type SenadoMateriaAtualizada = {
  IdentificacaoMateria: {
    CodigoMateria: string
    SiglaCasaIdentificacaoMateria?: string // 'SF' | 'CD'
    NomeCasaIdentificacaoMateria?: string
    SiglaSubtipoMateria: string // 'PL' | 'PEC' | 'PLP' | 'PLC' | etc.
    DescricaoSubtipoMateria?: string
    NumeroMateria: string
    AnoMateria: string
    DescricaoObjetivoProcesso?: string
    DescricaoIdentificacaoMateria?: string // ex: 'PLC 66/1992'
    IndicadorTramitando?: string // 'Sim' | 'Não'
    IdentificacaoProcesso?: string
  }
  DadosBasicosMateria?: {
    EmentaMateria?: string
    IndexacaoMateria?: string
    IndicadorComplementar?: string
    DataApresentacao?: string // YYYY-MM-DD
    DataLeitura?: string
  }
  AtualizacoesRecentes?: {
    Atualizacao: ArrayOrSingle<{
      InformacaoAtualizada: string
      DataUltimaAtualizacao: string
    }>
  }
}
