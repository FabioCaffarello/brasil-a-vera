// Funções puras do confronto de fidelidade partidária (Eixo 1, ADR-043).
//
// Duas definições de "o partido", NUNCA fundidas numa métrica única (D1):
//   - orientação declarada da liderança (orientacao_bancada) → L1
//   - maioria derivada da bancada (computada de voto_nominal) → L2
// Este módulo provê o núcleo L2 (maioria da bancada) e a reconstrução temporal;
// o confronto L1 reusa classifyAlinhamento de ./alinhamento.
//
// Fidelidade é medida contra o partido VIGENTE NA DATA DO VOTO (D3),
// reconstruído de filiacao_partidaria — nunca contra um partido fixo (ex.: 2022).
//
// IO isolado: estas funções recebem dados já carregados e não tocam o banco.

import type { Classificacao, Voto } from './alinhamento'

export interface PeriodoFiliacao {
  partidoSigla: string
  /** Data de início, YYYY-MM-DD. */
  dataInicio: string
  /** Data de fim, YYYY-MM-DD, ou null para filiação vigente. */
  dataFim: string | null
}

/**
 * Partido ao qual o parlamentar estava filiado numa data (ADR-043 D3).
 *
 * Reconstrução as-of: um período cobre `data` quando
 * `dataInicio <= data <= dataFim` (ou `dataFim` null = vigente). Datas são
 * comparadas como strings YYYY-MM-DD — ordem lexicográfica coincide com a
 * cronológica nesse formato.
 *
 * Fail-closed (D1/D3, mesmo princípio do ADR-041): se nenhum período cobre a
 * data (lacuna) OU mais de um período com siglas DIFERENTES a cobre
 * (sobreposição ambígua no dado de origem), retorna `null` — não se adivinha
 * o partido. Períodos com a mesma sigla sobrepostos não são ambíguos.
 */
export function partidoVigenteEm(
  filiacoes: ReadonlyArray<PeriodoFiliacao>,
  data: string,
): string | null {
  const cobrem = filiacoes.filter(
    (f) => f.dataInicio <= data && (f.dataFim === null || data <= f.dataFim),
  )
  if (cobrem.length === 0) return null
  const siglas = new Set(cobrem.map((f) => f.partidoSigla))
  return siglas.size === 1 ? (cobrem[0]?.partidoSigla ?? null) : null
}

export type PosicaoBancada = 'SIM' | 'NAO' | 'INDEFINIDA'

/**
 * Fração mínima de quórum (ADR-043 D1): pelo menos metade dos membros da
 * bancada na data registrou voto válido (SIM/NÃO). Constante pública fixa —
 * alterá-la exige novo ADR + recálculo do histórico.
 */
export const QUORUM_BANCADA_FRACAO = 0.5

/**
 * Posição da maioria da bancada numa votação (L2), pela regra do ADR-043 D1:
 *  - votos válidos = apenas SIM e NÃO (abstenção/obstrução/ausente fora);
 *  - quórum = votos válidos ≥ metade dos membros da bancada na data;
 *  - maioria = opção com estritamente mais de 50% dos votos válidos.
 *
 * Fail-closed: quórum não atingido OU empate → `INDEFINIDA` (a bancada não
 * tem posição apurável; o parlamentar é excluído do confronto naquela votação).
 */
export function posicaoBancada(args: {
  /** Votos SIM de membros da bancada na votação. */
  sim: number
  /** Votos NÃO de membros da bancada na votação. */
  nao: number
  /** Total de membros da bancada na data do voto (denominador do quórum). */
  totalMembros: number
}): PosicaoBancada {
  const { sim, nao, totalMembros } = args
  if (totalMembros <= 0) return 'INDEFINIDA'
  const validos = sim + nao
  // Quórum: validos ≥ totalMembros * QUORUM_BANCADA_FRACAO, sem ponto flutuante.
  if (validos * 2 < totalMembros) return 'INDEFINIDA'
  if (sim > nao) return 'SIM'
  if (nao > sim) return 'NAO'
  return 'INDEFINIDA'
}

/**
 * Classifica o voto do parlamentar contra a maioria da bancada (L2).
 * Espelha classifyAlinhamento (orientação L1), mas a referência é a posição
 * derivada da bancada:
 *   - posição INDEFINIDA (sem quórum/empate) → IGNORADO (fail-closed);
 *   - voto AUSENTE → IGNORADO (não participou);
 *   - ABSTENCAO/OBSTRUCAO contra SIM/NÃO → DIVERGENTE (não apoiou a maioria).
 */
export function classificarVsBancada(
  voto: Voto,
  posicao: PosicaoBancada,
): Classificacao {
  if (posicao === 'INDEFINIDA') return 'IGNORADO'
  if (voto === 'AUSENTE') return 'IGNORADO'
  return voto === posicao ? 'ALINHADO' : 'DIVERGENTE'
}

export interface FidelidadeStats {
  /** Votações comparáveis (posição definida + voto não-AUSENTE). */
  total: number
  /** Votou igual à maioria da bancada. */
  alinhados: number
  /** Votou diferente da maioria da bancada (termo canônico do D2). */
  divergentes: number
  /** % alinhado (0–100, arredondado); null se total = 0. */
  percentual: number | null
}

export function calcularFidelidadeBancada(
  eventos: ReadonlyArray<{ voto: Voto; posicao: PosicaoBancada }>,
): FidelidadeStats {
  let alinhados = 0
  let divergentes = 0
  for (const e of eventos) {
    const c = classificarVsBancada(e.voto, e.posicao)
    if (c === 'ALINHADO') alinhados++
    else if (c === 'DIVERGENTE') divergentes++
  }
  const total = alinhados + divergentes
  return {
    total,
    alinhados,
    divergentes,
    percentual: total > 0 ? Math.round((alinhados / total) * 100) : null,
  }
}

export interface TimelineMigracao {
  /** Períodos ordenados cronologicamente (mais antigo primeiro). */
  periodos: PeriodoFiliacao[]
  /** Nº de trocas = transições entre siglas distintas consecutivas. */
  trocas: number
}

/**
 * Timeline factual de migração partidária (ADR-043 D3). Apenas ordena os
 * períodos e conta transições entre siglas distintas — sem rótulo de
 * deslealdade. A→B→A conta 2 trocas; renomeação/repetição da mesma sigla, 0.
 */
export function construirTimelineMigracao(
  filiacoes: ReadonlyArray<PeriodoFiliacao>,
): TimelineMigracao {
  const periodos = [...filiacoes].sort((a, b) =>
    a.dataInicio < b.dataInicio ? -1 : a.dataInicio > b.dataInicio ? 1 : 0,
  )
  let trocas = 0
  let anterior: string | null = null
  for (const p of periodos) {
    if (anterior !== null && p.partidoSigla !== anterior) trocas++
    anterior = p.partidoSigla
  }
  return { periodos, trocas }
}
