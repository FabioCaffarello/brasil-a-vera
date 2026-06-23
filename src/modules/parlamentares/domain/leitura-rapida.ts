// "Veredito do Espelho" (ADR-051) — lógica PURA de classificação dos 4 fatos
// fixos do bloco de leitura rápida do perfil. Sem IO. O componente
// (src/components/parlamentar/leitura-rapida.tsx) só FORMATA o resultado.
//
// Os fatos são FIXOS e idênticos para todos os parlamentares (mitigação da
// "armadilha nº1": escolher "os mais salientes deste" = juízo disfarçado). Um
// fato nunca some — em ausência de dado, cai num estado de fallback honesto,
// nunca na omissão (omitir mudaria a lista por parlamentar). Conformidade
// ADR-040 §4: contagem/percentil factual, sem score, sem juízo.

import type { AlinhamentoResult } from '@/lib/queries/alinhamento'
import type { CoerenciaStats } from '@/lib/queries/coerencia'

import { ALINHAMENTO_AMOSTRA_MINIMA } from './alinhamento'

export type Casa = 'CAMARA' | 'SENADO'

// Fato 1 — alinhamento à orientação do partido (L2).
export type FatoAlinhamento =
  | {
      kind: 'completo'
      percentual: number
      total: number
      alinhados: number
      amostraInsuficiente: boolean
    }
  | { kind: 'federacao'; federacaoNome: string }
  | { kind: 'senado_sem_dado' } // dívida de ingestão #500 (Emenda ADR-040)
  | { kind: 'sem_orientacao' } // Câmara: liderança não publicou orientação

export function classificarAlinhamento(
  a: AlinhamentoResult,
  casa: Casa,
): FatoAlinhamento {
  // Precedência: federação (característica da fonte, ADR-041) antes de tudo.
  if (a.emFederacao && a.federacaoNome) {
    return { kind: 'federacao', federacaoNome: a.federacaoNome }
  }
  if (a.total > 0 && a.percentual !== null) {
    return {
      kind: 'completo',
      percentual: a.percentual,
      total: a.total,
      alinhados: a.alinhados,
      amostraInsuficiente: a.amostraInsuficiente,
    }
  }
  // total = 0: distingue Senado (dívida #500) de Câmara (sem orientação ainda).
  return casa === 'SENADO'
    ? { kind: 'senado_sem_dado' }
    : { kind: 'sem_orientacao' }
}

// Fato 2 — gasto da cota parlamentar (CEAP) vs percentil da casa (L2).
export type FatoGasto =
  | { kind: 'completo'; total: string; percentil: number | null }
  | { kind: 'sem_gasto' }

export function classificarGasto(
  gastos: { totalGeral: string; totalRegistros: number },
  percentilGastoCasa: number | null,
): FatoGasto {
  if (gastos.totalRegistros === 0) return { kind: 'sem_gasto' }
  return {
    kind: 'completo',
    total: gastos.totalGeral,
    percentil: percentilGastoCasa,
  }
}

// Fato 3 — proposições de autoria + percentil da casa (L2).
export type FatoProposicoes =
  | {
      kind: 'completo'
      count: number
      percentil: number | null
      parcial: boolean
    }
  | { kind: 'nenhuma' }

export function classificarProposicoes(
  count: number,
  percentilProposicoesCasa: number | null,
  parcial: boolean,
): FatoProposicoes {
  if (count === 0) return { kind: 'nenhuma' }
  return {
    kind: 'completo',
    count,
    percentil: percentilProposicoesCasa,
    parcial,
  }
}

// Fato 4 — coerência: pares de votos em sentidos opostos (L2, diferencial).
export type FatoCoerencia =
  | { kind: 'completo'; pares: number; classificaveis: number }
  | { kind: 'nenhum' }

export function classificarCoerencia(c: CoerenciaStats): FatoCoerencia {
  if (c.paresContraditoriosDetectados === 0) return { kind: 'nenhum' }
  return {
    kind: 'completo',
    pares: c.paresContraditoriosDetectados,
    classificaveis: c.votosClassificados,
  }
}

// Reexport para a copy do componente (limiar da amostra), sem reimportar do
// módulo de alinhamento direto no componente.
export { ALINHAMENTO_AMOSTRA_MINIMA }
