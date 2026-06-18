// Função pura de classificação e agregação de alinhamento partidário.
// Recebe pares (voto, orientação) já filtrados pelo banco e devolve
// classificação + métrica agregada. Testável sem IO.
//
// Decisões (ver issue #46 e PR de Ciclo 3 Wave 2.1):
// - Voto AUSENTE: parlamentar não participou — IGNORADO.
// - Orientação LIBERADO: bancada não orientou — IGNORADO.
// - Voto ABSTENCAO contra orientação SIM/NAO: divergente (parlamentar
//   não apoiou a posição da bancada).

export type Voto = 'SIM' | 'NAO' | 'ABSTENCAO' | 'AUSENTE' | 'OBSTRUCAO'
export type Orientacao = 'SIM' | 'NAO' | 'LIBERADO' | 'OBSTRUCAO'

export type Classificacao = 'ALINHADO' | 'DIVERGENTE' | 'IGNORADO'

/** Tabela de classificação explícita — ver issue #46. */
export function classifyAlinhamento(
  voto: Voto,
  orientacao: Orientacao,
): Classificacao {
  if (orientacao === 'LIBERADO') return 'IGNORADO'
  if (voto === 'AUSENTE') return 'IGNORADO'
  return voto === orientacao ? 'ALINHADO' : 'DIVERGENTE'
}

export interface AlinhamentoStats {
  /** Votos elegíveis para comparação (não LIBERADO + não AUSENTE). */
  total: number
  alinhados: number
  divergentes: number
  /**
   * % de alinhamento, 0–100, arredondado. `null` se total = 0 (sem dados
   * comparáveis — caller decide como apresentar empty state).
   */
  percentual: number | null
}

export function calcularAlinhamento(
  eventos: ReadonlyArray<{ voto: Voto; orientacao: Orientacao }>,
): AlinhamentoStats {
  let alinhados = 0
  let divergentes = 0
  for (const e of eventos) {
    const c = classifyAlinhamento(e.voto, e.orientacao)
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

/** Threshold de votações para mostrar alinhamento — abaixo disso, amostra
 * é estatisticamente pobre (issue #46). */
export const ALINHAMENTO_AMOSTRA_MINIMA = 50

// --- Alinhamento com orientação de bloco institucional (ADR-040) ---
//
// Moldura neutra: contagem factual de coincidências entre o voto do
// parlamentar e a orientação do bloco (Governo/Oposição) + quais votações.
// Sem score que ranqueie, sem juízo de valor. Mesma semântica determinística
// de classifyAlinhamento (igualdade de strings; LIBERADO/AUSENTE ignorados).

export interface EventoBloco<TVotacao = unknown> {
  bloco: string
  voto: Voto
  orientacao: Orientacao
  votacao: TVotacao
}

export interface VotacaoBloco<TVotacao> {
  votacao: TVotacao
  voto: Voto
  orientacao: Orientacao
  classificacao: Extract<Classificacao, 'ALINHADO' | 'DIVERGENTE'>
}

export interface AlinhamentoBlocoAgregado<TVotacao> {
  bloco: string
  total: number
  alinhados: number
  divergentes: number
  amostraInsuficiente: boolean
  /** Votações comparáveis, ordem preservada da entrada, até `limiteVotacoes`. */
  votacoes: VotacaoBloco<TVotacao>[]
}

// Agrega eventos (já ordenados pelo caller, p.ex. data desc) por bloco,
// preservando apenas os blocos pedidos e na ordem pedida. Eventos IGNORADO
// (LIBERADO/AUSENTE) não entram na contagem nem na lista.
export function agruparAlinhamentoBlocos<TVotacao>(
  eventos: ReadonlyArray<EventoBloco<TVotacao>>,
  blocos: readonly string[],
  limiteVotacoes: number,
): AlinhamentoBlocoAgregado<TVotacao>[] {
  return blocos.map((bloco) => {
    const doBloco = eventos.filter((e) => e.bloco === bloco)
    const stats = calcularAlinhamento(doBloco)
    const votacoes: VotacaoBloco<TVotacao>[] = []
    for (const e of doBloco) {
      if (votacoes.length >= limiteVotacoes) break
      const c = classifyAlinhamento(e.voto, e.orientacao)
      if (c === 'IGNORADO') continue
      votacoes.push({
        votacao: e.votacao,
        voto: e.voto,
        orientacao: e.orientacao,
        classificacao: c,
      })
    }
    return {
      bloco,
      total: stats.total,
      alinhados: stats.alinhados,
      divergentes: stats.divergentes,
      amostraInsuficiente: stats.total < ALINHAMENTO_AMOSTRA_MINIMA,
      votacoes,
    }
  })
}
