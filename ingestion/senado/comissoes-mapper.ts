import {
  ehNaoComissaoPorNome,
  type MembroComissaoRow,
  truncarData,
} from '../shared/membro-comissao'
import type {
  SenadoColegiadoDetalhe,
  SenadoComissaoParticipacao,
} from './comissoes-schema'

export {
  dedupePorChaveNatural,
  type MembroComissaoRow,
} from '../shared/membro-comissao'

// Discriminador comissão-vs-outros-colegiados (Senado), determinístico via
// `TipoColegiado.CodigoTipo` do detalhe /comissao/{codigo}.
//
// A mesma política KEEP-BY-DEFAULT da Câmara (anti-#481): excluímos só os tipos
// que comprovadamente NÃO são comissão — grupos parlamentares (amizade
// interparlamentar) e frentes parlamentares (advocacy suprapartidário informal)
// — e mantemos o resto. Isso preserva comissões mistas do Congresso (CMO,
// CMMC…), que um whitelist de comissões-permanentes-do-SF deixaria de fora,
// repetindo o erro de sub-filtragem do #481.
export const SENADO_CODIGO_TIPO_NAO_COMISSAO: ReadonlySet<number> = new Set([
  129, // Grupo Parlamentar
  130, // Frente Parlamentar
])

export function isComissaoSenado(codigoTipo: number): boolean {
  return !SENADO_CODIGO_TIPO_NAO_COMISSAO.has(codigoTipo)
}

// Fallback quando o detalhe /comissao/{codigo} não traz o tipo: o endpoint só
// descreve colegiados ATIVOS, então CPIs/CPMIs já encerradas (CPMI 8 de Janeiro,
// CPI das BETS…) e outros colegiados extintos voltam vazios. Descartá-las seria
// perder justamente as comissões mais relevantes (#481). Usamos então a sigla
// da própria participação: grupos (GP*) e frentes (FP*) seguem convenção estável
// de nomenclatura no Senado; o resto é mantido como comissão.
const SENADO_SIGLA_NAO_COMISSAO = /^(GP|FP)/i

export function isComissaoSenadoPorSigla(sigla: string): boolean {
  return !SENADO_SIGLA_NAO_COMISSAO.test(sigla)
}

// Extrai o CodigoTipo do colegiado do detalhe /comissao/{codigo}. Retorna null
// se a estrutura não trouxer o tipo (raro; o orchestrator trata como erro e não
// descarta nem grava a participação sem classificação).
export function extractCodigoTipoSenado(
  detalhe: SenadoColegiadoDetalhe,
): number | null {
  const colegiados =
    detalhe.ComissoesCongressoNacional.Colegiados?.Colegiado ?? []
  const tipo = colegiados[0]?.TipoColegiado
  if (!tipo) return null
  return Number.isFinite(tipo.CodigoTipo) ? tipo.CodigoTipo : null
}

// O Senado já entrega DescricaoParticipacao binária (Titular/Suplente). Mesmo
// assim aplicamos a mesma regra da Câmara: o que não é suplente é titular. O
// valor cru é preservado em cargo_origem.
export function mapTipoParticipacaoSenado(
  descricao: string | null | undefined,
): 'TITULAR' | 'SUPLENTE' {
  return (descricao ?? '').trim().toLowerCase() === 'suplente'
    ? 'SUPLENTE'
    : 'TITULAR'
}

// Monta a row a partir da participação + tipo do colegiado. `codigoTipo` é null
// quando o detalhe /comissao/{codigo} não trouxe o tipo (colegiado extinto) —
// nesse caso cai no fallback por sigla (keep-by-default). Retorna null quando o
// colegiado não é comissão (filtrado) ou quando falta DataInicio (coluna NOT
// NULL — rejeitamos a linha em vez de quebrar a transação).
export function mapMembroComissaoSenado(
  participacao: SenadoComissaoParticipacao,
  codigoTipo: number | null,
  parlamentarId: string,
): MembroComissaoRow | null {
  const ident = participacao.IdentificacaoComissao
  // Guarda por nome ANTES do tipo/sigla: pega conselhos honoríficos (Comenda/
  // Prêmio/Diploma/Ordem), procuradorias, ouvidoria e grupos que escapam tanto
  // do tipo 129/130 (extintos → detalhe vazio) quanto do prefixo GP/FP (ex.:
  // GTMTI, "Grupo Brasileiro do Parlatino"). Auditoria do fallback, PR #491.
  if (ehNaoComissaoPorNome(ident.NomeComissao)) return null

  const ehComissao =
    codigoTipo !== null
      ? isComissaoSenado(codigoTipo)
      : isComissaoSenadoPorSigla(ident.SiglaComissao)
  if (!ehComissao) return null

  const dataInicio = truncarData(participacao.DataInicio)
  if (dataInicio === null) return null

  return {
    parlamentarId,
    comissaoSourceId: ident.CodigoComissao,
    comissaoNome: ident.NomeComissao,
    comissaoSigla: ident.SiglaComissao,
    cargoOrigem: participacao.DescricaoParticipacao ?? null,
    tipoParticipacao: mapTipoParticipacaoSenado(
      participacao.DescricaoParticipacao,
    ),
    dataInicio,
    dataFim: truncarData(participacao.DataFim),
  }
}
