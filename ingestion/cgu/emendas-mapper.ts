import type { CguEmendaRecord } from './emendas-schema'

// Mapper + vinculador + agregador das emendas parlamentares (ADR-066).
// Funções puras.
//
// O CSV é por emenda × classificação orçamentária × localidade; o produto
// quer emenda × localidade (soma das classificações). Persistimos apenas
// emendas INDIVIDUAIS com autor vinculado a um parlamentar (ADR-066 D3):
// bancada/comissão/relator não têm autor-parlamentar único, e 2014 vem com
// autor "Sem informação" (medido: 0% de autor informado — cai no filtro).

// Sentinelas de ausência usadas pela fonte.
const SEM_INFORMACAO = new Set(['', 'S/I', 'Sem informação'])

// Código UF IBGE (2 primeiros dígitos) → sigla. A coluna "UF" do CSV traz o
// nome por extenso; a sigla derivada do código é determinística e imune a
// grafia/acentuação.
const UF_POR_CODIGO_IBGE: Record<string, string> = {
  '11': 'RO',
  '12': 'AC',
  '13': 'AM',
  '14': 'RR',
  '15': 'PA',
  '16': 'AP',
  '17': 'TO',
  '21': 'MA',
  '22': 'PI',
  '23': 'CE',
  '24': 'RN',
  '25': 'PB',
  '26': 'PE',
  '27': 'AL',
  '28': 'SE',
  '29': 'BA',
  '31': 'MG',
  '32': 'ES',
  '33': 'RJ',
  '35': 'SP',
  '41': 'PR',
  '42': 'SC',
  '43': 'RS',
  '50': 'MS',
  '51': 'MT',
  '52': 'GO',
  '53': 'DF',
}

/** Ano mínimo com autor informado na fonte (2014 = 0%, medido 2026-07-14). */
export const ANO_MINIMO = 2015

export function isEmendaIndividual(tipoEmenda: string): boolean {
  return tipoEmenda.includes('Individual')
}

/**
 * "394200,00" → centavos (39420000). Valores da fonte têm sempre vírgula
 * decimal e sem separador de milhar; sinal negativo é preservado
 * (estornos/cancelamentos). Vazio/sentinela → 0.
 */
export function valorBRLParaCentavos(valor: string): number {
  const trimmed = valor.trim()
  if (SEM_INFORMACAO.has(trimmed)) return 0
  const negativo = trimmed.startsWith('-')
  const digits = trimmed.replace(/[^\d,]/g, '')
  const [inteiro, decimal = ''] = digits.split(',')
  const centavos =
    Number(inteiro || '0') * 100 + Number(decimal.padEnd(2, '0').slice(0, 2))
  return negativo ? -centavos : centavos
}

/** Centavos → string canônica do numeric ("39420000" → "394200.00"). */
export function centavosParaNumeric(centavos: number): string {
  const negativo = centavos < 0
  const abs = Math.abs(centavos)
  const inteiro = Math.floor(abs / 100)
  const decimal = String(abs % 100).padStart(2, '0')
  return `${negativo ? '-' : ''}${inteiro}.${decimal}`
}

/**
 * Forma canônica de nome para o match autor↔parlamentar: caixa alta, sem
 * acentos (NFD), espaços colapsados.
 */
export function normalizeNomeAutor(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export interface EmendaRow {
  codigoEmenda: string
  ano: number
  tipoEmenda: string
  autorCodigo: string
  autorNome: string
  localidade: string
  municipioIbgeCodigo: string | null
  municipioNome: string | null
  uf: string | null
  centavosEmpenhado: number
  centavosLiquidado: number
  centavosPago: number
  centavosRapInscritos: number
  centavosRapPagos: number
}

export function mapEmenda(record: CguEmendaRecord): EmendaRow {
  const codigoMunicipio = record['Código Município IBGE'].trim()
  const temMunicipio =
    !SEM_INFORMACAO.has(codigoMunicipio) && codigoMunicipio !== '-1'
  const codigoUf = record['Código UF IBGE'].trim().slice(0, 2)
  return {
    codigoEmenda: record['Código da Emenda'].trim(),
    ano: Number(record['Ano da Emenda']),
    tipoEmenda: record['Tipo de Emenda'].trim(),
    autorCodigo: record['Código do Autor da Emenda'].trim(),
    autorNome: record['Nome do Autor da Emenda'].trim(),
    localidade: record['Localidade de aplicação do recurso'].trim(),
    municipioIbgeCodigo: temMunicipio ? codigoMunicipio : null,
    municipioNome: temMunicipio ? record.Município.trim() : null,
    uf: UF_POR_CODIGO_IBGE[codigoUf] ?? null,
    centavosEmpenhado: valorBRLParaCentavos(record['Valor Empenhado']),
    centavosLiquidado: valorBRLParaCentavos(record['Valor Liquidado']),
    centavosPago: valorBRLParaCentavos(record['Valor Pago']),
    centavosRapInscritos: valorBRLParaCentavos(
      record['Valor Restos A Pagar Inscritos'],
    ),
    centavosRapPagos: valorBRLParaCentavos(
      record['Valor Restos A Pagar Pagos'],
    ),
  }
}

export interface ParlamentarNome {
  id: string
  nome: string
  nomeCivil: string | null
}

export interface VinculadorAutores {
  /** id do parlamentar, ou null (sem match / ambíguo — fail-closed). */
  match(autorNome: string): string | null
  /** Nomes normalizados que colidiram entre parlamentares distintos. */
  ambiguos(): string[]
}

// Vínculo por nome oficial (ADR-066 D3, padrão ADR-063): match exato do nome
// normalizado contra nome eleitoral E nome civil. Dois parlamentares DISTINTOS
// com o mesmo nome normalizado → ambíguo → nunca vincula (fail-closed).
export function criarVinculadorAutores(
  parlamentares: readonly ParlamentarNome[],
): VinculadorAutores {
  const AMBIGUO = Symbol('ambiguo')
  const porNome = new Map<string, string | typeof AMBIGUO>()

  const registrar = (nome: string, id: string): void => {
    const chave = normalizeNomeAutor(nome)
    if (chave === '') return
    const existente = porNome.get(chave)
    if (existente === undefined) {
      porNome.set(chave, id)
    } else if (existente !== id) {
      porNome.set(chave, AMBIGUO)
    }
  }

  for (const p of parlamentares) {
    registrar(p.nome, p.id)
    if (p.nomeCivil) registrar(p.nomeCivil, p.id)
  }

  return {
    match(autorNome: string): string | null {
      const encontrado = porNome.get(normalizeNomeAutor(autorNome))
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

export interface EmendaAgregada {
  parlamentarId: string
  codigoEmenda: string
  ano: number
  tipoEmenda: string
  autorCodigo: string
  autorNome: string
  localidade: string
  municipioIbgeCodigo: string | null
  municipioNome: string | null
  uf: string | null
  centavosEmpenhado: number
  centavosLiquidado: number
  centavosPago: number
  centavosRapInscritos: number
  centavosRapPagos: number
}

export type MotivoDescarte =
  | 'nao_individual'
  | 'ano_antigo'
  | 'sem_autor'
  | 'sem_match'

export interface MatchAnoStats {
  vinculadas: number
  semMatch: number
}

export interface EmendaAggregator {
  /** @returns null se a linha entrou na agregação; senão o motivo. */
  add(row: EmendaRow): MotivoDescarte | null
  snapshot(): EmendaAgregada[]
  /** Taxa de vínculo por ano (ADR-066 D3) — vai para o log estruturado. */
  matchPorAno(): Record<number, MatchAnoStats>
  /** Autores (nomes verbatim) que ficaram sem vínculo, ordenados. */
  autoresSemMatch(): string[]
}

// Agrega por (codigoEmenda, localidade) somando as classificações
// orçamentárias. Memória proporcional a emendas vinculadas (~dezenas de
// milhares), não ao tamanho do CSV.
export function createEmendaAggregator(
  vinculador: VinculadorAutores,
): EmendaAggregator {
  const porChave = new Map<string, EmendaAgregada>()
  const stats = new Map<number, MatchAnoStats>()
  const semMatch = new Set<string>()

  const statsDoAno = (ano: number): MatchAnoStats => {
    let s = stats.get(ano)
    if (!s) {
      s = { vinculadas: 0, semMatch: 0 }
      stats.set(ano, s)
    }
    return s
  }

  const add = (row: EmendaRow): MotivoDescarte | null => {
    if (!isEmendaIndividual(row.tipoEmenda)) return 'nao_individual'
    if (row.ano < ANO_MINIMO) return 'ano_antigo'
    if (SEM_INFORMACAO.has(row.autorNome)) return 'sem_autor'

    const parlamentarId = vinculador.match(row.autorNome)
    if (parlamentarId === null) {
      statsDoAno(row.ano).semMatch++
      semMatch.add(row.autorNome)
      return 'sem_match'
    }
    statsDoAno(row.ano).vinculadas++

    const chave = `${row.codigoEmenda}\u0000${row.localidade}`
    const existente = porChave.get(chave)
    if (existente) {
      existente.centavosEmpenhado += row.centavosEmpenhado
      existente.centavosLiquidado += row.centavosLiquidado
      existente.centavosPago += row.centavosPago
      existente.centavosRapInscritos += row.centavosRapInscritos
      existente.centavosRapPagos += row.centavosRapPagos
    } else {
      porChave.set(chave, { parlamentarId, ...row })
    }
    return null
  }

  return {
    add,
    snapshot(): EmendaAgregada[] {
      return [...porChave.values()].sort(
        (a, b) =>
          a.codigoEmenda.localeCompare(b.codigoEmenda) ||
          a.localidade.localeCompare(b.localidade),
      )
    },
    matchPorAno(): Record<number, MatchAnoStats> {
      return Object.fromEntries([...stats.entries()].sort(([a], [b]) => a - b))
    },
    autoresSemMatch(): string[] {
      return [...semMatch].sort()
    },
  }
}
