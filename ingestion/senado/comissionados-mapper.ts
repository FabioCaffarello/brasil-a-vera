import { normalizeNome } from '@/lib/normalize'
import type {
  SenadoComissionadoItem,
  SenadoRemuneracaoItem,
} from './comissionados-schema'

// Mapper dos comissionados de gabinete do Senado (ADR-064 E2). Puro.
//
// A API administrativa não referencia o CodigoParlamentar do senador — o
// vínculo é pelo NOME do senador embutido no nome da lotação ("Gabinete do
// Senador Izalci Lucas", "Escritório de Apoio 1 do Senador Jorge Viana").
// Match por nome normalizado contra nome/nomeCivil, fail-closed em
// ambiguidade (padrão ADR-063; mesma mecânica do vínculo de emendas).

// Gabinete do Senador X | Gabinete da Senadora X | Escritório de Apoio N
// do Senador X | Escritório de Apoio N da Senadora X.
const LOTACAO_GABINETE_RE =
  /^(?:Gabinete|Escritório de Apoio \d+) d[ao] Senador[a]?\s+(.+)$/i

/**
 * Extrai o nome do senador dono da lotação; null quando a lotação não é
 * gabinete/escritório de senador (órgãos administrativos ficam fora).
 */
export function extrairNomeSenador(lotacaoNome: string): string | null {
  const match = lotacaoNome.trim().match(LOTACAO_GABINETE_RE)
  return match ? match[1].trim() : null
}

export interface VinculadorSenadores {
  /** id do parlamentar, ou null (sem match / ambíguo — fail-closed). */
  match(nome: string): string | null
  ambiguos(): string[]
}

export function criarVinculadorSenadores(
  senadores: readonly { id: string; nome: string; nomeCivil: string | null }[],
): VinculadorSenadores {
  const AMBIGUO = Symbol('ambiguo')
  const porNome = new Map<string, string | typeof AMBIGUO>()

  const registrar = (nome: string, id: string): void => {
    const chave = normalizeNome(nome)
    if (chave === '') return
    const existente = porNome.get(chave)
    if (existente === undefined) {
      porNome.set(chave, id)
    } else if (existente !== id) {
      porNome.set(chave, AMBIGUO)
    }
  }

  for (const s of senadores) {
    registrar(s.nome, s.id)
    if (s.nomeCivil) registrar(s.nomeCivil, s.id)
  }

  return {
    match(nome: string): string | null {
      const encontrado = porNome.get(normalizeNome(nome))
      return typeof encontrado === 'string' ? encontrado : null
    },
    ambiguos(): string[] {
      return [...porNome.entries()]
        .filter(([, v]) => typeof v !== 'string')
        .map(([k]) => k)
        .sort()
    },
  }
}

/** '789,41' (vírgula decimal da fonte) → centavos inteiros; null se vazio. */
export function remuneracaoParaCentavos(valor: string): number {
  const trimmed = valor.trim()
  if (trimmed === '') return 0
  const negativo = trimmed.startsWith('-')
  const digits = trimmed.replace(/[^\d,]/g, '')
  const [inteiro, decimal = ''] = digits.split(',')
  const centavos =
    Number(inteiro || '0') * 100 + Number(decimal.padEnd(2, '0').slice(0, 2))
  return negativo ? -centavos : centavos
}

export function centavosParaNumeric(centavos: number): string {
  const negativo = centavos < 0
  const abs = Math.abs(centavos)
  return `${negativo ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}

/**
 * Indexa remuneracao_basica por NOME normalizado, somando as folhas do mês
 * (Normal + Suplementar). O `sequencial` de /remuneracoes NÃO é o mesmo de
 * /comissionados (espaços de id distintos, verificado 2026-07-16) — o join
 * é por nome. Homônimos na folha (mesmo nome, sequenciais distintos) são
 * descartados: fail-closed, nunca atribuímos a remuneração de um homônimo.
 */
export function indexarRemuneracoes(
  itens: readonly SenadoRemuneracaoItem[],
): Map<string, number> {
  const porNome = new Map<
    string,
    { centavos: number; sequenciais: Set<string> }
  >()
  for (const item of itens) {
    const chave = normalizeNome(item.nome)
    const centavos = remuneracaoParaCentavos(item.remuneracao_basica ?? '')
    const atual = porNome.get(chave)
    if (atual) {
      atual.centavos += centavos
      atual.sequenciais.add(item.sequencial)
    } else {
      porNome.set(chave, {
        centavos,
        sequenciais: new Set([item.sequencial]),
      })
    }
  }
  const resultado = new Map<string, number>()
  for (const [chave, agg] of porNome) {
    if (agg.sequenciais.size === 1) resultado.set(chave, agg.centavos)
  }
  return resultado
}

export interface ComissionadoSenadoRow {
  parlamentarId: string
  sequencial: string
  nome: string
  grupo: string
  cargo: string | null
}

export type DescarteSenado =
  | 'desligado'
  | 'fora_de_gabinete'
  | 'sem_match_senador'

/**
 * Mapeia um item de comissionado para a row de gabinete; string = motivo do
 * descarte (fail-closed, contabilizado no runner).
 */
export function mapComissionadoSenado(
  item: SenadoComissionadoItem,
  vinculador: VinculadorSenadores,
): ComissionadoSenadoRow | DescarteSenado {
  if ((item.situacao ?? '').toUpperCase().includes('DESLIGADO')) {
    return 'desligado'
  }
  const nomeSenador = extrairNomeSenador(item.lotacao?.nome ?? '')
  if (nomeSenador === null) return 'fora_de_gabinete'

  const parlamentarId = vinculador.match(nomeSenador)
  if (parlamentarId === null) return 'sem_match_senador'

  const cargo = (item.funcao?.nome ?? item.cargo?.nome ?? '').trim()
  return {
    parlamentarId,
    sequencial: item.sequencial,
    nome: item.nome.trim(),
    grupo: (item.vinculo ?? 'COMISSIONADO').trim(),
    cargo: cargo === '' ? null : cargo,
  }
}
