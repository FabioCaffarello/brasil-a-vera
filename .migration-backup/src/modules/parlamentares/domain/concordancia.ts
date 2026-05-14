// Função pura: dado conjuntos de votos por parlamentar, computa concordância
// par a par. Testável sem IO. Usada por src/lib/queries/comparar.ts depois
// de buscar os votos no banco (ou em testes unitários com dados sintéticos).
//
// Definição operacional:
// - Concordância só conta votações em comum (ambos com voto não-AUSENTE)
// - Voto coincidente = mesmo tipo (SIM/SIM, NAO/NAO, ABSTENCAO/ABSTENCAO etc)
// - Voto AUSENTE em qualquer um dos lados → ignorado (parlamentar não votou)
// - Threshold mínimo de votações em comum: 5 (espelhando getTop5Afinidade)

export type Voto = 'SIM' | 'NAO' | 'ABSTENCAO' | 'AUSENTE' | 'OBSTRUCAO'

export interface VotoParlamentar {
  votacaoId: string
  voto: Voto
}

export interface ConcordanciaPar {
  /** ID do parlamentar A (sempre o de menor id por convenção). */
  parlamentarA: string
  /** ID do parlamentar B. */
  parlamentarB: string
  /** Votações em comum onde ambos votaram (não AUSENTE). */
  total: number
  /** Quantas das `total` foram coincidentes. */
  coincidentes: number
  /** % concordância (0–100, arredondado). null se total < amostraMinima. */
  percentual: number | null
}

export const CONCORDANCIA_AMOSTRA_MINIMA = 5

/**
 * Para cada par de parlamentares na lista (ordem fixa por ID asc), calcula
 * concordância. Para N parlamentares devolve N*(N-1)/2 pares.
 *
 * Implementação O(N² × max(votos_por_parlamentar)) — aceitável para N ≤ 3
 * que é o limite da feature comparar.
 */
export function calcularConcordancias(
  votosPorParlamentar: ReadonlyMap<string, ReadonlyArray<VotoParlamentar>>,
): ConcordanciaPar[] {
  const ids = Array.from(votosPorParlamentar.keys()).sort()
  const out: ConcordanciaPar[] = []

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = ids[i]
      const b = ids[j]
      const votosA = votosPorParlamentar.get(a) ?? []
      const votosB = votosPorParlamentar.get(b) ?? []

      // Indexa votos de B por votacaoId para lookup O(1)
      const votosBPorVotacao = new Map<string, Voto>()
      for (const v of votosB) {
        if (v.voto !== 'AUSENTE') votosBPorVotacao.set(v.votacaoId, v.voto)
      }

      let total = 0
      let coincidentes = 0
      for (const va of votosA) {
        if (va.voto === 'AUSENTE') continue
        const vb = votosBPorVotacao.get(va.votacaoId)
        if (vb === undefined) continue
        total++
        if (va.voto === vb) coincidentes++
      }

      out.push({
        parlamentarA: a,
        parlamentarB: b,
        total,
        coincidentes,
        percentual:
          total >= CONCORDANCIA_AMOSTRA_MINIMA
            ? Math.round((coincidentes / total) * 100)
            : null,
      })
    }
  }

  return out
}
