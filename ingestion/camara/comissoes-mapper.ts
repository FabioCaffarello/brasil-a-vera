import type { MembroComissaoRow } from '../shared/membro-comissao'
import { ehNaoComissaoPorNome, truncarData } from '../shared/membro-comissao'
import type {
  CamaraDeputadoOrgao,
  CamaraOrgaoDetalhe,
} from './comissoes-schema'

export {
  dedupePorChaveNatural,
  type MembroComissaoRow,
  truncarData,
} from '../shared/membro-comissao'

// Discriminador comissão-vs-outros-órgãos (Câmara), determinístico via
// `codTipoOrgao` do detalhe /orgaos/{id}. Referência completa em
// /referencias/orgaos/codTipoOrgao.
//
// Política KEEP-BY-DEFAULT (princípio anti-#481): em vez de listar os tipos de
// comissão a manter, listamos os tipos que comprovadamente NÃO são comissão e
// mantemos o resto. Assim um tipo de comissão novo/atípico entra por padrão (e
// aparece no log de tipos mantidos) em vez de ser descartado em silêncio —
// descartar força re-ingestão depois, o erro que o filtro de orientação do
// #481 corrigiu.
export const CAMARA_COD_TIPO_ORGAO_NAO_COMISSAO: ReadonlySet<number> = new Set([
  10, // Grupo de Trabalho
  11, // Conselho
  12, // Procuradoria Parlamentar
  13, // Corregedoria
  14, // Ouvidoria
  15, // Coordenadoria da Mulher
  22, // Conferência
  26, // Plenário Virtual
  27, // Plenário Virtual CD
  28, // Grupo de Trabalho de Comissões
  101, // Partido Político
  102, // Bloco Parlamentar
  103, // Governo na CD
  104, // Minoria na CD
  105, // Governo no CN
  106, // Minoria no CN
  121, // Maioria na CD
  122, // Oposição na CD
  123, // Maioria no CN
  124, // Oposição no CN
  1000, // Importação das proposições inativas
  12000, // Órgão da Câmara dos Deputados (administrativo)
  12500, // Órgão Legislativo da CD
  81001, // Órgão do Congresso Nacional
  22000, // Órgão do Senado Federal
])

export function isComissaoCamara(codTipoOrgao: number): boolean {
  return !CAMARA_COD_TIPO_ORGAO_NAO_COMISSAO.has(codTipoOrgao)
}

// Câmara expõe papéis ricos em `titulo` (Presidente, 1º Vice-Presidente,
// Titular, Suplente…). O enum tipo_participacao é binário: tudo que não é
// suplente é titular (presidência/vice são membros titulares com cargo). O
// papel cru é preservado em cargo_origem pelo orchestrator.
export function mapTipoParticipacaoCamara(
  titulo: string | null,
): 'TITULAR' | 'SUPLENTE' {
  return (titulo ?? '').trim().toLowerCase() === 'suplente'
    ? 'SUPLENTE'
    : 'TITULAR'
}

// Monta a row a partir do item da lista + detalhe do órgão. Retorna null quando
// o órgão não é comissão (filtrado) ou quando falta dataInicio (coluna NOT NULL
// — rejeitamos a linha em vez de quebrar a transação).
export function mapMembroComissaoCamara(
  orgao: CamaraDeputadoOrgao,
  detalhe: CamaraOrgaoDetalhe,
  parlamentarId: string,
): MembroComissaoRow | null {
  if (!isComissaoCamara(detalhe.codTipoOrgao)) return null
  // Guarda cross-casa por nome (conselho honorífico/procuradoria/grupo etc.).
  // Redundante com o filtro de codTipoOrgao na Câmara, mas mantém simetria.
  if (ehNaoComissaoPorNome(orgao.nomeOrgao)) return null

  const dataInicio = truncarData(orgao.dataInicio)
  if (dataInicio === null) return null

  return {
    parlamentarId,
    comissaoSourceId: String(orgao.idOrgao),
    comissaoNome: orgao.nomeOrgao,
    comissaoSigla: orgao.siglaOrgao ?? detalhe.sigla ?? null,
    cargoOrigem: orgao.titulo ?? null,
    tipoParticipacao: mapTipoParticipacaoCamara(orgao.titulo),
    dataInicio,
    dataFim: truncarData(orgao.dataFim),
  }
}
