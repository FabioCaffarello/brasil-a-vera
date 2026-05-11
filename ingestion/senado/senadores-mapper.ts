import type { ParlamentarRow } from '../shared/parlamentar-row'

import type { SenadorItem } from './senadores-schema'

const BASE_URL = 'https://legis.senado.leg.br/dadosabertos'

// Legislatura corrente em que esta ingestão opera. Mandatos no Senado duram
// 8 anos (2 legislaturas). TODO Wave 1+: refinar usando DataInicio/DataFim do
// payload do Senado quando começarmos a precisar deles.
const LEGISLATURA_ATUAL = 57

// Retorna a legislatura "em exercício hoje" para o senador. Quando a Primeira
// legislatura do mandato já é >= a atual, o senador está na primeira metade
// (use Primeira). Caso contrário, está na segunda metade do mandato (use Segunda).
function legislaturaAtual(input: SenadorItem): number {
  const primeira =
    input.Mandato?.PrimeiraLegislaturaDoMandato?.NumeroLegislatura
  const segunda = input.Mandato?.SegundaLegislaturaDoMandato?.NumeroLegislatura
  if (primeira && Number(primeira) >= LEGISLATURA_ATUAL) {
    return Number(primeira)
  }
  if (segunda) return Number(segunda)
  if (primeira) return Number(primeira)
  throw new Error('Senador sem legislatura informada no Mandato')
}

// Mapeia o payload do Senado para a row canônica.
//
// Limitações conhecidas:
// - `nomeCivil`, `cpf`: a listagem não traz; viriam de
//   `/senador/{codigo}` em PR posterior.
// - `partidoNome`: usa a sigla como fallback (igual ao mapper da Câmara).
// - `situacaoMandato`: assumido EXERCICIO (endpoint é `lista/atual`).
export function mapSenadorListagem(input: SenadorItem): ParlamentarRow {
  const id = input.IdentificacaoParlamentar
  const uf =
    input.Mandato?.UfParlamentar?.toUpperCase() ??
    id.UfParlamentar.toUpperCase()
  return {
    sourceId: id.CodigoParlamentar,
    nome: id.NomeParlamentar,
    nomeCivil: id.NomeCompletoParlamentar ?? null,
    cpf: null,
    casa: 'SENADO',
    partidoSigla: id.SiglaPartidoParlamentar,
    partidoNome: id.SiglaPartidoParlamentar,
    uf,
    urlFoto: id.UrlFotoParlamentar ?? null,
    situacaoMandato: 'EXERCICIO',
    legislatura: legislaturaAtual(input),
    trustLevel: 'L1',
    sourceUrl:
      id.UrlPaginaParlamentar ?? `${BASE_URL}/senador/${id.CodigoParlamentar}`,
  }
}
