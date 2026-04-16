import type { TipoParticipacao } from '../../src/core/parlamentar/domain/value-objects/tipo-participacao.vo'
import type { TipoOrientacao } from '../../src/core/votacao/domain/value-objects/tipo-orientacao.vo'
import type { TipoVoto } from '../../src/core/votacao/domain/value-objects/tipo-voto.vo'
import { logger } from '../shared/logger'
import type { SenadoParlamentarResumo, SenadoVotacao } from './senado-types'

/**
 * A API do Senado retorna arrays como objeto único quando há só 1 elemento.
 * Este helper normaliza para sempre trabalhar com array.
 *
 * Importante: strings NÃO são tratadas como array-like — uma string entra como
 * `[string]` (não iteramos caracteres).
 */
export function ensureArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === null || value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

const SENADO_VOTO_MAP: Record<string, TipoVoto> = {
  Sim: 'SIM',
  Não: 'NAO',
  Abstenção: 'ABSTENCAO',
  Obstrução: 'OBSTRUCAO',
}

const SENADO_VOTO_AUSENTE = new Set([
  'P-NRV', // Presente, Não Registrou Voto
  'MIS', // Em Missão
  'NCom', // Não Compareceu
  'LP', // Licença Pessoal
  'AP', // Afastado / Em Exercício da Presidência
  'LS', // Licença Saúde
])

/**
 * Código usado em votações secretas: o sistema registra que o senador votou,
 * mas NÃO revela a direção. Em sync-votacoes-senado.ts, votos de votações
 * com `Secreta === 'S'` são FILTRADOS antes de chegar aqui. Esta constante
 * existe para defensiva (silenciar warning se o código aparecer em contexto
 * inesperado).
 */
export const SENADO_VOTO_SECRETO = 'Votou'

/**
 * Mapeia o voto do Senado para o TipoVoto do domain.
 * - "Sim" / "Não" / "Abstenção" / "Obstrução" → votos efetivos
 * - "P-NRV", "MIS", "NCom", "LP", "AP", "LS" → AUSENTE (ausências legítimas)
 * - "Votou" → AUSENTE (defensiva — votação secreta deveria estar filtrada upstream)
 * - "Presidente (art. 51 RISF)" e similares → AUSENTE
 */
export function mapSenadoVoto(voto: string): TipoVoto {
  const normalized = voto.trim()
  const mapped = SENADO_VOTO_MAP[normalized]
  if (mapped) return mapped
  if (SENADO_VOTO_AUSENTE.has(normalized)) return 'AUSENTE'
  if (normalized === SENADO_VOTO_SECRETO) return 'AUSENTE'
  if (normalized.toLowerCase().includes('presidente')) return 'AUSENTE'
  logger.warn('Voto do Senado não mapeado', { voto: normalized })
  return 'AUSENTE'
}

/**
 * Resultado da votação vem como letra única:
 * "A" = Aprovada, "R" = Rejeitada, "P" = Prejudicada, outros = não-aprovada.
 * Tratamento case-insensitive.
 */
export function mapSenadoResultado(resultado: string | undefined): boolean {
  if (!resultado) return false
  return resultado.trim().toUpperCase() === 'A'
}

/**
 * Combina DataSessao (YYYY-MM-DD) e HoraInicio (HH:MM ou HH:MM:SS, pode ser null).
 * Fallback: meio-dia se HoraInicio for null. Fallback final: data pura.
 */
export function parseSenadoDateTime(
  dataSessao: string,
  horaInicio: string | null,
): Date {
  const horaRaw = horaInicio?.trim()
  // Normaliza HH:MM para HH:MM:00
  const hora = horaRaw
    ? horaRaw.length === 5
      ? `${horaRaw}:00`
      : horaRaw
    : '12:00:00'
  const date = new Date(`${dataSessao}T${hora}`)
  if (Number.isNaN(date.getTime())) {
    logger.warn('Data/hora inválida, usando fallback', {
      dataSessao,
      horaInicio,
    })
    return new Date(dataSessao)
  }
  return date
}

/**
 * Converte string serializada em número com fallback 0.
 * A API do Senado serializa números como string.
 */
export function parseIntSafe(value: string | undefined | null): number {
  if (!value) return 0
  const n = Number.parseInt(value, 10)
  return Number.isNaN(n) ? 0 : n
}

/**
 * Mapeia um senador para input do SyncParlamentarUseCase.
 *
 * IMPORTANTE: prefixa idExterno com 'senado-' para evitar colisão com IDs
 * numéricos da Câmara (deputado id 5322 vs senador id 5322 colidiriam).
 */
export function mapSenadorToParlamentarCommand(
  senador: SenadoParlamentarResumo,
) {
  const ident = senador.IdentificacaoParlamentar
  return {
    idExterno: `senado-${ident.CodigoParlamentar}`,
    nome: ident.NomeParlamentar,
    nomeCivil: ident.NomeCompletoParlamentar ?? null,
    cpf: null as string | null, // Lista não retorna CPF
    uf: ident.UfParlamentar,
    partidoSigla: ident.SiglaPartidoParlamentar,
    partidoNome: ident.SiglaPartidoParlamentar, // Lista não retorna nome completo
    casa: 'SENADO' as const,
    urlFoto: ident.UrlFotoParlamentar,
    sourceUrl: `https://legis.senado.leg.br/dadosabertos/senador/${ident.CodigoParlamentar}`,
  }
}

/**
 * Mapeia votação do Senado para input do SyncVotacaoUseCase.
 *
 * - idExterno é prefixado com 'senado-' para não colidir com IDs da Câmara
 * - parlamentarIdExterno dos votos também é prefixado com 'senado-'
 * - Como a API NÃO retorna totalizadores (TotalVotosSim/Nao/Abstencao não existem),
 *   contamos a partir do array de votos
 * - Votação secreta (`Secreta === 'S'`): votos nominais vêm como "Votou" sem
 *   direção. Filtramos COMPLETAMENTE os votos (não persistimos nominais) e
 *   marcamos com orgao 'PLENARIO-SF-SECRETA' para distinguir no banco.
 *   Contadores ficam zerados.
 * - Sem CodigoMateria → proposicaoIdExterno null
 */
export function mapVotacaoSenadoToCommand(votacao: SenadoVotacao) {
  const ano = new Date(votacao.DataSessao).getFullYear()
  const isSecreta = votacao.Secreta === 'S'

  const votos = isSecreta
    ? []
    : ensureArray(votacao.Votos?.VotoParlamentar).map((v) => ({
        parlamentarIdExterno: `senado-${v.CodigoParlamentar}`,
        tipoVoto: mapSenadoVoto(v.Voto),
        dataHora: null as Date | null,
      }))

  const votosSim = votos.filter((v) => v.tipoVoto === 'SIM').length
  const votosNao = votos.filter((v) => v.tipoVoto === 'NAO').length
  const abstencoes = votos.filter((v) => v.tipoVoto === 'ABSTENCAO').length
  const ausentes = votos.filter((v) => v.tipoVoto === 'AUSENTE').length

  return {
    idExterno: `senado-${votacao.CodigoSessaoVotacao}`,
    proposicaoIdExterno: votacao.CodigoMateria ?? null,
    dataHora: parseSenadoDateTime(votacao.DataSessao, votacao.HoraInicio),
    descricao:
      votacao.DescricaoVotacao ||
      votacao.DescricaoIdentificacaoMateria ||
      `Votação Senado ${votacao.CodigoSessaoVotacao}`,
    orgao: isSecreta ? 'PLENARIO-SF-SECRETA' : 'PLENARIO-SF',
    votosSim,
    votosNao,
    abstencoes,
    ausentes,
    aprovada: mapSenadoResultado(votacao.Resultado),
    sourceUrl: `https://legis.senado.leg.br/dadosabertos/dados/ListaVotacoes${ano}.json`,
    votos,
    orientacoes: [] as Array<{
      partidoSigla: string
      orientacao: TipoOrientacao
    }>,
  }
}

/**
 * Parser de data ISO `YYYY-MM-DD` (formato real usado em /comissoes.json
 * e /historico.json — verificado via curl).
 *
 * Retorna `null` se vazio, undefined ou inválido. Toleramos whitespace.
 *
 * Nota: a documentação do Senado às vezes menciona `YYYYMMDD` (sem hífens),
 * mas a API real serializa com hífens. Esta função aceita os dois formatos
 * por defensiva.
 */
export function parseSenadoDate(value: string | undefined): Date | null {
  if (!value) return null
  const trimmed = value.trim()
  if (trimmed === '') return null

  // Aceita YYYY-MM-DD ou YYYYMMDD
  let iso: string
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    iso = trimmed
  } else if (/^\d{8}$/.test(trimmed)) {
    iso = `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}`
  } else {
    logger.warn('Data do Senado em formato não reconhecido', { value })
    return null
  }

  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Mapeia DescricaoParticipacao do Senado para TipoParticipacao do domain.
 * Valores observados: 'Titular', 'Suplente', 'Presidente', 'Vice-Presidente',
 * '1º Vice-Presidente', '2º Vice-Presidente', 'Relator', etc.
 *
 * Comparação case-insensitive porque a API às vezes mistura caixas.
 */
export function mapDescricaoParticipacao(descricao: string): TipoParticipacao {
  const upper = descricao.trim().toUpperCase()
  if (upper === 'SUPLENTE') return 'SUPLENTE'
  if (upper.includes('PRESIDENTE')) return 'PRESIDENTE'
  // 'TITULAR', 'RELATOR' e qualquer outro → TITULAR
  return 'TITULAR'
}
