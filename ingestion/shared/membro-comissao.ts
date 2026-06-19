// Tipos e helpers compartilhados pela ingestão de membros de comissão das duas
// casas (Câmara e Senado). A tabela parlamentares.membro_comissao é única; os
// mappers por casa convergem para esta row antes do INSERT.

export interface MembroComissaoRow {
  parlamentarId: string
  comissaoSourceId: string
  comissaoNome: string
  comissaoSigla: string | null
  // Papel cru da origem (Câmara: `titulo`; Senado: `DescricaoParticipacao`).
  cargoOrigem: string | null
  tipoParticipacao: 'TITULAR' | 'SUPLENTE'
  dataInicio: string
  dataFim: string | null
}

// Normaliza datas para `date` (YYYY-MM-DD). A Câmara devolve datetime ISO
// ("2026-03-03T00:00"); o Senado já devolve date, mas truncamos defensivamente.
// Retorna null para entrada vazia/nula.
export function truncarData(iso: string | null | undefined): string | null {
  if (!iso) return null
  const [data] = iso.split('T')
  return data && data.length > 0 ? data : null
}

// Dedupe intra-parlamentar pela chave natural do unique index
// (parlamentar_id, comissao_source_id, data_inicio): a API pode repetir a mesma
// comissão na mesma data de início; sem dedupe o bulk INSERT viola o unique.
// Mantém a última ocorrência (tende a trazer dataFim mais atualizada).
export function dedupePorChaveNatural(
  rows: MembroComissaoRow[],
): MembroComissaoRow[] {
  const porChave = new Map<string, MembroComissaoRow>()
  for (const row of rows) {
    porChave.set(`${row.comissaoSourceId}|${row.dataInicio}`, row)
  }
  return [...porChave.values()]
}
