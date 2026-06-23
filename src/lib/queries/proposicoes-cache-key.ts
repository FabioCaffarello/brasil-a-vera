import type { FiltrosProposicao } from './proposicoes'

// Fragmento determinístico dos filtros para compor cache keys (ADR-018).
// `q` é trimado para casar com o que `whereForQ` efetivamente aplica. Não
// inclui cursor nem ordem — callers anexam o que for relevante à sua key.
//
// Módulo separado (sem `import { db }`) de propósito: assim o teste de
// determinismo/colisão pode importar esta função pura SEM puxar o driver do
// banco (que instancia neon() no load e exige DATABASE_URL — indisponível no
// ambiente de testes unit da CI). O `import type` acima é apagado em runtime.
export function proposicoesFiltrosKey(filtros: FiltrosProposicao): string {
  return `tipo=${filtros.tipo ?? '_'}:ano=${filtros.ano ?? '_'}:situacao=${filtros.situacao ?? '_'}:tema=${filtros.tema ?? '_'}:q=${filtros.q?.trim() || '_'}`
}
