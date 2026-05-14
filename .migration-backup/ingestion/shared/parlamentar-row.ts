// Shape canônico de uma row pronta para INSERT em
// `parlamentares.parlamentar`. Mappers de cada fonte (Câmara, Senado, ...)
// produzem este tipo, e o script de ingestão consome — desacoplando a
// peculiaridade de cada API do schema interno.

export interface ParlamentarRow {
  sourceId: string
  nome: string
  nomeCivil: string | null
  cpf: string | null
  casa: 'CAMARA' | 'SENADO'
  partidoSigla: string
  partidoNome: string
  uf: string
  urlFoto: string | null
  situacaoMandato: 'EXERCICIO' | 'AFASTADO' | 'SUPLENCIA' | 'LICENCA'
  legislatura: number
  trustLevel: 'L1' | 'L2' | 'L3' | 'L4'
  sourceUrl: string
}
