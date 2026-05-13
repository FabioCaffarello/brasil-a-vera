// Funções puras de mapeamento dos eventos de tramitação do Senado.
// Compartilha a função `truncateAt` com o mapper da Câmara em lugar próprio
// (re-implementada aqui pra manter os módulos por casa independentes;
// duplicação trivial vs. acoplamento cross-folder).

const MAX_RESUMIDA = 200

export interface TramitacaoMapped {
  data: Date
  orgao: string
  /** Truncado em ≤200 chars; ellipsis adicionado se cortou. */
  descricaoResumida: string
  /** Texto longo quando difere da resumida; null caso contrário. */
  descricaoCompleta: string | null
  /** Estado após o evento — Senado não traz consistente; geralmente null. */
  situacaoResultante: string | null
  /** `informeLegislativo.id` (globalmente único na API Senado). */
  sourceId: string
}

export function truncateAt(s: string, max: number): string {
  if (s.length <= max) return s
  const slice = s.slice(0, max - 1)
  const lastSpace = slice.lastIndexOf(' ')
  if (lastSpace >= Math.floor(max * 0.7)) {
    return `${slice.slice(0, lastSpace).trimEnd()}…`
  }
  return `${slice.trimEnd()}…`
}

export function mapInformeSenado(raw: {
  id: number
  data: string
  descricao: string
  colegiado?: {
    sigla?: string | null
    nome?: string | null
  } | null
  enteAdministrativo?: {
    sigla?: string | null
    nome?: string | null
  } | null
}): TramitacaoMapped {
  const descricaoTrim = raw.descricao.trim()
  const descricaoResumida = truncateAt(descricaoTrim, MAX_RESUMIDA)
  // Senado: descrição é texto único; quando truncada, a completa é o texto
  // original. Quando não foi truncada, completa = null (sem duplicação).
  const descricaoCompleta =
    descricaoTrim.length > descricaoResumida.length ? descricaoTrim : null

  // Órgão: priorizar sigla do colegiado (comissão), depois sigla do ente
  // administrativo (secretaria). Senado expõe ambos em alguns eventos;
  // colegiado é o que aparece no UI público da Câmara/Senado.
  const orgao =
    raw.colegiado?.sigla?.trim() ||
    raw.enteAdministrativo?.sigla?.trim() ||
    raw.colegiado?.nome?.trim() ||
    raw.enteAdministrativo?.nome?.trim() ||
    'SF'

  return {
    data: new Date(raw.data.replace(' ', 'T')),
    orgao,
    descricaoResumida,
    descricaoCompleta,
    // Senado não expõe situação por evento de forma consistente; o
    // `historicoSituacoes` (antigo) fica em outra parte do payload. Por
    // ora, null. Refinar quando tivermos dados reais.
    situacaoResultante: null,
    sourceId: String(raw.id),
  }
}
