// Mapper puro: converte o envelope parsed do Senado para os valores que
// serão gravados na tabela `afastamento_senador` (Sprint 13.0, ADR-058).

import type { LicencaParlamentarEnvelope } from './afastamentos-schema'

export interface AfastamentoRow {
  motivoSigla: string
  motivoDescricao: string | null
  dataInicio: string
  dataFim: string | null
}

export function mapAfastamentos(
  envelope: LicencaParlamentarEnvelope,
): AfastamentoRow[] {
  const licencas =
    envelope.LicencaParlamentar.Parlamentar?.Licencas?.Licenca ?? []
  const rows: AfastamentoRow[] = []
  for (const l of licencas) {
    if (!l.dataInicio) continue
    rows.push({
      motivoSigla: l.motivoSigla,
      motivoDescricao: l.motivoDescricao,
      dataInicio: l.dataInicio,
      dataFim: l.dataFim,
    })
  }
  return rows
}
