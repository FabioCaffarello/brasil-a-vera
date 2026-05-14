// Geração de CSV RFC 4180 compatível, com BOM UTF-8 para abrir corretamente
// no Excel/Numbers em português.
// Pure, testável sem ambiente Next.

const UTF8_BOM = '﻿'
const ROW_SEPARATOR = '\r\n'

export type CsvValue = string | number | boolean | Date | null | undefined

export interface CsvColumn<T> {
  header: string
  /** Extrai o valor da linha; undefined/null viram string vazia. */
  get: (row: T) => CsvValue
}

function escapeCell(value: CsvValue): string {
  if (value === null || value === undefined) return ''
  let s: string
  if (value instanceof Date) {
    s = value.toISOString()
  } else if (typeof value === 'boolean') {
    s = value ? 'true' : 'false'
  } else {
    s = String(value)
  }
  // RFC 4180: se contém vírgula, aspas ou newline, envolver em aspas duplas
  // e escapar aspas internas dobrando-as.
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function buildLine(cells: string[]): string {
  return cells.join(',')
}

/**
 * Constrói o conteúdo CSV completo a partir de linhas + definição de colunas.
 * Adiciona BOM UTF-8 (necessário para Excel reconhecer acentos no Windows).
 */
export function toCsv<T>(rows: Iterable<T>, columns: CsvColumn<T>[]): string {
  const lines: string[] = []
  lines.push(buildLine(columns.map((c) => escapeCell(c.header))))
  for (const row of rows) {
    lines.push(buildLine(columns.map((c) => escapeCell(c.get(row)))))
  }
  return UTF8_BOM + lines.join(ROW_SEPARATOR) + ROW_SEPARATOR
}

export interface CsvCountInfo {
  /** Total de linhas disponíveis para os filtros aplicados (sem limite). */
  total: number
  /** Linhas efetivamente retornadas no CSV (após limite/truncamento). */
  returned: number
}

/**
 * Headers padrão para resposta HTTP de arquivo CSV. `filename` é apenas
 * informativo no Content-Disposition — o navegador usa para o "Salvar como".
 *
 * Quando `counts` é informado, adiciona headers de truncagem honesta:
 * `X-Total-Count`, `X-Returned-Count`, `X-Truncated`. Permite ao consumidor
 * (curl, scripts, devtools) detectar quando o CSV é subset — refinar filtros
 * para baixar tudo. Headers customizados não interferem em quem só consome o
 * payload CSV (Excel, LibreOffice, pandas).
 */
export function csvResponseHeaders(
  filename: string,
  counts?: CsvCountInfo,
): HeadersInit {
  const base: Record<string, string> = {
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': `attachment; filename="${filename}"`,
    // CSVs gerados são dinâmicos (filtrados por params); evita CDN agressivo.
    'cache-control': 'private, max-age=0, no-store',
  }
  if (counts) {
    base['x-total-count'] = String(counts.total)
    base['x-returned-count'] = String(counts.returned)
    base['x-truncated'] = String(counts.total > counts.returned)
  }
  return base
}
