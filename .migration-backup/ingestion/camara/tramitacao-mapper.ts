// Funções puras de mapeamento dos eventos de tramitação da Câmara para o
// shape interno do banco. Testáveis sem rede.

const MAX_RESUMIDA = 200

export interface TramitacaoMapped {
  data: Date
  orgao: string
  /** Truncado em ≤200 chars; ellipsis adicionado se cortou. */
  descricaoResumida: string
  /** Texto longo do despacho quando difere significativamente da resumida; null caso contrário. */
  descricaoCompleta: string | null
  /** Estado após o evento. */
  situacaoResultante: string | null
  /** `sequencia` do evento na fonte — chave natural por proposição. */
  sourceId: string
}

// Trunca em fronteira de palavra quando o corte cai depois de >=70% do limite
// (evita cortar palavras curtas; ellipsis sinaliza truncamento).
export function truncateAt(s: string, max: number): string {
  if (s.length <= max) return s
  const slice = s.slice(0, max - 1)
  const lastSpace = slice.lastIndexOf(' ')
  if (lastSpace >= Math.floor(max * 0.7)) {
    return `${slice.slice(0, lastSpace).trimEnd()}…`
  }
  return `${slice.trimEnd()}…`
}

export function mapTramitacaoCamara(raw: {
  dataHora: string
  sequencia: number
  siglaOrgao: string
  descricaoTramitacao: string
  descricaoSituacao?: string | null
  despacho?: string | null
}): TramitacaoMapped {
  const descricaoResumida = truncateAt(
    raw.descricaoTramitacao.trim(),
    MAX_RESUMIDA,
  )
  const despachoTrim = (raw.despacho ?? '').trim()
  // descricao_completa só quando o despacho diverge do resumida E tem valor.
  // Câmara frequentemente duplica os dois campos; quando iguais, completa = null.
  const descricaoCompleta =
    despachoTrim.length > 0 && despachoTrim !== raw.descricaoTramitacao.trim()
      ? despachoTrim
      : null
  const situacao = raw.descricaoSituacao?.trim()
  return {
    data: new Date(raw.dataHora),
    orgao: raw.siglaOrgao.trim(),
    descricaoResumida,
    descricaoCompleta,
    situacaoResultante: situacao && situacao.length > 0 ? situacao : null,
    sourceId: String(raw.sequencia),
  }
}
