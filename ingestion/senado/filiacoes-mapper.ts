import type { FiliacaoPeriodo } from '../shared/filiacao'
import type { SenadoFiliacao } from './filiacoes-schema'

// O Senado entrega filiações como PERÍODOS prontos
// (`/senador/{codigo}/filiacoes` → Filiacao[]): cada item tem o partido,
// `DataFiliacao` e `DataDesfiliacao` (ausente = vínculo atual). Mapeamento
// direto, sem colapso (ao contrário da Câmara). L1.

export function mapFiliacoesSenado(
  filiacoes: SenadoFiliacao[],
): FiliacaoPeriodo[] {
  return filiacoes
    .filter((f) => f.Partido?.SiglaPartido && f.DataFiliacao)
    .map((f) => ({
      partidoSigla: f.Partido.SiglaPartido,
      dataInicio: f.DataFiliacao,
      dataFim: f.DataDesfiliacao ?? null,
    }))
}
