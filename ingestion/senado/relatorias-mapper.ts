import type { RelatoriaProcResponse } from './relatorias-schema'

// Funções puras (sem rede/banco) — testáveis isoladamente.

export interface RelatoriaSenado {
  codigoMateria: string
  /** Data de designação (YYYY-MM-DD) ou null — desempata o "último relator". */
  designadoEm: string | null
}

// Extrai o tipo `SenadoRelatoriasEnvelope` para manter compatibilidade nominal
// com importadores externos (o type foi renomeado mas a interface de saída é a mesma).
export type SenadoRelatoriasEnvelope = RelatoriaProcResponse

// Extrai as relatorias do senador a partir do novo endpoint /processo/relatoria.
// Mantém só o relator PRINCIPAL (descricaoTipoRelator === 'Relator'): exclui
// "Relator Ad hoc" e "Relator Revisor". Dedup por matéria, guardando a
// designação mais recente (o senador pode ter relatado a mesma matéria em mais
// de uma comissão, em épocas distintas).
export function mapRelatoriasSenado(
  items: RelatoriaProcResponse,
): RelatoriaSenado[] {
  const porMateria = new Map<string, string | null>()

  for (const r of items) {
    const tipo = r.descricaoTipoRelator.trim().toLowerCase()
    if (tipo !== 'relator') continue

    const codigo = r.codigoMateria
    // dataDesignacao vem como "YYYY-MM-DD HH:MM:SS" — extraímos só a data.
    const designadoEm = r.dataDesignacao
      ? (r.dataDesignacao.split(' ')[0] ?? null)
      : null

    const atual = porMateria.get(codigo)
    // Guarda a designação mais recente (string YYYY-MM-DD ordena cronológico).
    if (
      atual === undefined ||
      (designadoEm !== null && (atual === null || designadoEm > atual))
    ) {
      porMateria.set(codigo, designadoEm)
    }
  }

  return [...porMateria.entries()].map(([codigoMateria, designadoEm]) => ({
    codigoMateria,
    designadoEm,
  }))
}
