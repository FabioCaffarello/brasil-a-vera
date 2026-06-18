// Mapeia o campo `orientacaoVoto` da API da Câmara para o enum interno
// `orientacao_bancada`. Função pura, testável sem rede/banco.

import type { CamaraOrientacao } from './orientacoes-schema'

export type OrientacaoBancada = 'SIM' | 'NAO' | 'LIBERADO' | 'OBSTRUCAO'

export type TipoLideranca = 'P' | 'B'

function normalize(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

const TABLE: Record<string, OrientacaoBancada> = {
  sim: 'SIM',
  s: 'SIM',
  nao: 'NAO',
  n: 'NAO',
  liberado: 'LIBERADO',
  obstrucao: 'OBSTRUCAO',
}

// Retorna null para entradas vazias, nulas ou desconhecidas. Caller decide
// se conta como skip silencioso (vazio) ou warn (desconhecido).
export function mapOrientacaoVoto(
  input: string | null | undefined,
): OrientacaoBancada | null {
  if (input == null) return null
  const trimmed = input.trim()
  if (trimmed === '') return null
  return TABLE[normalize(trimmed)] ?? null
}

// Blocos institucionais de posicionamento retidos (ADR-040), indexados pela
// forma normalizada → label canônico armazenado em `partido_sigla`. Federações
// e blocos partidários ('Fdr ...', 'Bl ...') NÃO entram aqui e são descartados.
const BLOCO_CANONICO: Record<string, string> = {
  governo: 'Governo',
  oposicao: 'Oposição',
  maioria: 'Maioria',
  minoria: 'Minoria',
}

// Decide se a linha de orientação é retida e qual `(partido_sigla, tipo)` grava.
//  - 'P': orientação partidária formal (codTipoLideranca 'P' com código de
//    partido). Sigla preservada verbatim — casa com parlamentar.partido_sigla.
//  - 'B': bloco institucional Governo/Oposição/Maioria/Minoria. Sigla
//    canonizada (acento/caixa estáveis) para join previsível.
//  - null: descartar (federação, bloco ad-hoc, ou 'P' sem código — anomalia).
export function classificarOrientacao(
  o: CamaraOrientacao,
): { partidoSigla: string; tipoLideranca: TipoLideranca } | null {
  if (o.codTipoLideranca === 'P') {
    if (o.codPartidoBloco == null) return null
    return { partidoSigla: o.siglaPartidoBloco, tipoLideranca: 'P' }
  }
  if (o.codTipoLideranca === 'B') {
    const canonico = BLOCO_CANONICO[normalize(o.siglaPartidoBloco)]
    if (!canonico) return null
    return { partidoSigla: canonico, tipoLideranca: 'B' }
  }
  return null
}
