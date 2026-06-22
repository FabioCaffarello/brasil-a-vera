import type { SenadoRelatoriasEnvelope } from './relatorias-schema'

// Funções puras (sem rede/banco) — testáveis isoladamente.

export interface RelatoriaSenado {
  codigoMateria: string
  /** DataDesignacao (YYYY-MM-DD) ou null — desempata o "último relator". */
  designadoEm: string | null
}

// Extrai as relatorias do senador. Mantém só o relator PRINCIPAL
// (DescricaoTipoRelator === 'Relator'): exclui ad hoc / parcial / revisor /
// vencido, aproximando o "relator" da matéria. Dedup por matéria, guardando a
// designação mais recente (o senador pode ter relatado a mesma matéria em mais
// de uma comissão).
export function mapRelatoriasSenado(
  input: SenadoRelatoriasEnvelope,
): RelatoriaSenado[] {
  const relatorias =
    input.MateriasRelatoriaParlamentar.Parlamentar.Relatorias?.Relatoria ?? []

  const porMateria = new Map<string, string | null>()
  for (const r of relatorias) {
    const tipo = (r.DescricaoTipoRelator ?? '').trim().toLowerCase()
    if (tipo !== 'relator') continue
    const codigo = r.Materia.Codigo
    const designadoEm = r.DataDesignacao?.trim() || null
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
