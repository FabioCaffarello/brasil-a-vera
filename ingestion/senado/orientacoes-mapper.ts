// Funções puras para mapear a orientação de bancada do Senado
// (feed `orientacaoBancada`) para o modelo interno `orientacao_bancada`.
//
// Decisões (ADR-040 §4 + #500):
//  - Voto: SIM→SIM, NÃO→NAO, LIVRE→LIBERADO, OBSTRUÇÃO→OBSTRUCAO. Qualquer
//    outro valor (null, SECRETO, desconhecido) → null = pula+loga (fail-closed,
//    nunca inventa enum).
//  - tipo_lideranca (regra A1'): denylist de blocos institucionais/temáticos →
//    'B'; tudo o mais → 'P'. Falha fechado: sigla desconhecida vira 'P'
//    (partido), preservando o join de alinhamento partidário. Mesma família da
//    classificação da Câmara.

export type OrientacaoVoto = 'SIM' | 'NAO' | 'LIBERADO' | 'OBSTRUCAO'
export type TipoLideranca = 'P' | 'B'

// Blocos institucionais/temáticos do Senado, normalizados (sem acento, upper).
// `Governo`/`Oposição`/`Maioria`/`Minoria` = posicionamento; `Banc Fem` =
// bancada temática. Tudo fora desta lista é tratado como partido ('P').
const BLOCOS_INSTITUCIONAIS = new Set([
  'GOVERNO',
  'OPOSICAO',
  'MAIORIA',
  'MINORIA',
  'BANC FEM',
])

const VOTO_TABLE: Record<string, OrientacaoVoto> = {
  SIM: 'SIM',
  NAO: 'NAO',
  LIVRE: 'LIBERADO',
  OBSTRUCAO: 'OBSTRUCAO',
}

function normalizar(valor: string): string {
  // NFD + remoção de diacríticos combinantes (U+0300–U+036F) → compara sem
  // acento ("NÃO"→"NAO", "OPOSIÇÃO"→"OPOSICAO").
  return valor
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
}

export function classifyTipoLideranca(partido: string): TipoLideranca {
  return BLOCOS_INSTITUCIONAIS.has(normalizar(partido)) ? 'B' : 'P'
}

export function mapVotoOrientacao(
  voto: string | null | undefined,
): OrientacaoVoto | null {
  if (voto == null) return null
  return VOTO_TABLE[normalizar(voto)] ?? null
}

export interface RawOrientacao {
  partido: string
  voto: string | null | undefined
}

export interface OrientacaoRow {
  partidoSigla: string
  orientacao: OrientacaoVoto
  tipoLideranca: TipoLideranca
}

export interface BuildOrientacoesResult {
  rows: OrientacaoRow[]
  nullSkipped: number
  unmappedSkipped: number
}

// Monta as linhas de orientação de uma votação. Deduplica por partido_sigla
// (defensivo — a PK (votacao_id, partido_sigla) é única no Senado, probe #500;
// se a fonte repetir, mantém a última). Pula votos nulos/não-mapeáveis.
export function buildOrientacoes(raw: RawOrientacao[]): BuildOrientacoesResult {
  const byPartido = new Map<string, OrientacaoRow>()
  let nullSkipped = 0
  let unmappedSkipped = 0

  for (const linha of raw) {
    const orientacao = mapVotoOrientacao(linha.voto)
    if (orientacao == null) {
      if (linha.voto == null) nullSkipped++
      else unmappedSkipped++
      continue
    }
    const partidoSigla = linha.partido.trim()
    byPartido.set(partidoSigla, {
      partidoSigla,
      orientacao,
      tipoLideranca: classifyTipoLideranca(partidoSigla),
    })
  }

  return { rows: [...byPartido.values()], nullSkipped, unmappedSkipped }
}

// Chave de conteúdo que liga uma votação do `orientacaoBancada` (sem id
// compartilhado com `/votacao`) a uma `votacao` persistida. Null em qualquer
// parte → chave inválida (não casa). Normaliza a sigla (trim/upper).
export function materiaSessaoKey(parts: {
  sigla: string | null | undefined
  numero: number | null | undefined
  ano: number | null | undefined
  numeroSessao: number | null | undefined
}): string | null {
  const { sigla, numero, ano, numeroSessao } = parts
  if (
    sigla == null ||
    sigla.trim() === '' ||
    numero == null ||
    ano == null ||
    numeroSessao == null
  ) {
    return null
  }
  return `${sigla.trim().toUpperCase()}|${numero}|${ano}|${numeroSessao}`
}
