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

// Exclusão por NOME, cross-casa, para órgãos que NÃO são comissão mas escapam
// dos discriminadores por tipo/sigla. Descoberto auditando o fallback do Senado
// (PR #491): conselhos honoríficos (Comenda/Prêmio/Diploma/Ordem), procuradorias,
// corregedoria, ouvidoria e grupos cuja sigla não começa com GP/FP (ex.: GTMTI,
// "Grupo Brasileiro do Parlatino") vazavam classificados como comissão — uma
// afirmação falsa numa ferramenta de diligência (Comenda Zilda Arns ≠ comissão).
//
// É deny-list ancorada no INÍCIO do nome: comissões reais começam com
// "Comissão"/"Subcomissão"/"Comitê"/"CPI"/"CPMI"; nenhuma começa com estas
// palavras. Aplicada às duas casas, alinha a assimetria preexistente (a Câmara
// já excluía Conselho via codTipoOrgao 11; o Senado não).
const NOME_NAO_COMISSAO =
  /^\s*(Conselho|Comenda|Procuradoria|Corregedoria|Ouvidoria|Grupo)\b/i

export function ehNaoComissaoPorNome(nome: string): boolean {
  return NOME_NAO_COMISSAO.test(nome)
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
