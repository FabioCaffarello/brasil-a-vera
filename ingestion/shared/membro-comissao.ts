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
  /^\s*(Conselho|Comenda|Procuradoria|Corregedoria|Ouvidoria|Grupo|Frente|Veto|Relatores)\b/i

export function ehNaoComissaoPorNome(nome: string): boolean {
  return NOME_NAO_COMISSAO.test(nome)
}

// Padrão POSITIVO de nome de comissão, incl. as abreviações que a fonte do
// Senado grava no lugar do nome por extenso: CESP-/CMESP- (Comissão Especial /
// Mista Especial), CT-/CTEX/CTIN (Comissão Temporária / Externa / Interna),
// Subc. (Subcomissão).
const NOME_COMISSAO =
  /^\s*(Comiss|Subcomiss|Subc\.|Comit[êe]|CPI|CPMI|Representa|CMESP|CESP|CT)/i

export type ClasseColegiado = 'comissao' | 'ruido' | 'indeterminado'

// Classificador tripartite por NOME — base do teste de robustez. NÃO dirige a
// ingestão (que filtra por tipo/sigla/deny); existe para tornar a deny-list
// PROATIVA: um nome que não casa nem ruído conhecido nem padrão de comissão cai
// em 'indeterminado' e precisa de triagem humana (vira deny → ruído, ou entra na
// allow-list → comissão). Assim uma família de ruído nova falha um assert em vez
// de depender de alguém ler o log.
export function classificarColegiadoPorNome(nome: string): ClasseColegiado {
  if (ehNaoComissaoPorNome(nome)) return 'ruido'
  if (NOME_COMISSAO.test(nome)) return 'comissao'
  return 'indeterminado'
}

export interface IndeterminadoComissao {
  nome: string
  motivo: string
}

// Indeterminados RATIFICADOS como comissão real: o nome não casa padrão positivo
// nem deny, mas é colegiado legítimo com captura de nome suja na fonte (gravou o
// ato de criação, ou só o tema sem prefixo). Cada entrada carrega o nome COMPLETO
// + o motivo — anti-zumbi: a justificativa anda junto, e o teste exige que toda
// entrada ainda apareça no corpus real (sem allow-list órfã).
export const INDETERMINADOS_COMISSAO: readonly IndeterminadoComissao[] = [
  {
    nome: 'ATN  Nº 2, de 2013 - CONSOLIDAÇÃO DA LEGISLAÇÃO FEDERAL E REGULAMENTAÇÃO DE DISPOSITIVOS DA CF.',
    motivo:
      'Comissão Mista de Consolidação da Legislação Federal (sigla CMCLF); a fonte gravou o ato de criação (ATN nº 2/2013) no lugar do nome.',
  },
  {
    nome: 'ATN nº 3, de 2015 - Responsabilidade das Estatais',
    motivo:
      'Comissão Mista de Responsabilidade das Estatais (sigla CMLRE); nome capturado como o ATN de criação.',
  },
  {
    nome: 'Ato do Presidente do Congresso Nacional nº 15, de 2012',
    motivo:
      'Comissão Mista Especial da EMC 69 (sigla CMEEMC69); nome sujo = ato de criação. Ratificado.',
  },
  {
    nome: 'REFORMA POLÍTICA - 2011',
    motivo:
      'Comissão Temporária de Reforma Política (sigla CTRP); nome terso, sem prefixo de colegiado.',
  },
  {
    nome: 'Violação do Direito Humano à Saúde',
    motivo: 'CPI (sigla CPIVDHS); nome = tema sem o prefixo CPI.',
  },
]

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
