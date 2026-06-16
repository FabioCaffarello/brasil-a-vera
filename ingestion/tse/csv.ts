// Parser CSV quote-aware e multi-linha, sob medida para os dumps do TSE.
//
// Por que não um split ingênuo por `;`/`\n` (confirmado empiricamente no CSV
// real do TSE 2022, princípio 13):
// - Encoding ISO-8859-1 (decodificar com TextDecoder('latin1') ANTES daqui).
// - Separador `;`, campos de texto entre aspas duplas, numéricos sem aspas
//   (campos mistos numa mesma linha).
// - `DS_BEM_CANDIDATO` é texto livre e contém quebras de linha (LF) embutidas
//   dentro das aspas → ~2.174 registros de 96k se partiriam ao meio num parser
//   line-based, corrompendo silenciosamente o dataset.
// - Aspas escapadas como `""` dentro de campo entre aspas.
//
// Entrada: string já decodificada (Latin-1 → UTF-8). Saída: linhas como
// arrays de campos (a primeira linha é o header). Função pura.
export function parseCsv(content: string, delimiter = ';'): string[][] {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false
  // Distingue "linha em branco" (descartável) de "linha com 1 campo vazio".
  let rowTouched = false
  let i = 0
  const n = content.length

  const endField = (): void => {
    row.push(field)
    field = ''
  }
  const endRow = (): void => {
    endField()
    if (rowTouched) rows.push(row)
    row = []
    rowTouched = false
  }

  while (i < n) {
    const ch = content[i]

    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      field += ch
      i++
      continue
    }

    if (ch === '"') {
      inQuotes = true
      rowTouched = true
      i++
      continue
    }
    if (ch === delimiter) {
      endField()
      rowTouched = true
      i++
      continue
    }
    if (ch === '\r') {
      i++
      if (content[i] === '\n') i++
      endRow()
      continue
    }
    if (ch === '\n') {
      i++
      endRow()
      continue
    }
    field += ch
    rowTouched = true
    i++
  }

  // Último campo/linha — o arquivo pode não terminar com newline.
  if (rowTouched || field.length > 0) {
    endRow()
  }

  return rows
}

// Converte as linhas em objetos chaveados pelo header (primeira linha).
// Linhas com contagem de campos diferente do header são puladas e reportadas
// via `onSkip` (não estourar silenciosamente — princípio de honestidade).
export function rowsToRecords(
  rows: string[][],
  onSkip?: (row: string[], index: number) => void,
): Array<Record<string, string>> {
  if (rows.length === 0) return []
  const header = rows[0]
  const records: Array<Record<string, string>> = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.length !== header.length) {
      onSkip?.(row, i)
      continue
    }
    const record: Record<string, string> = {}
    for (let c = 0; c < header.length; c++) {
      record[header[c]] = row[c]
    }
    records.push(record)
  }
  return records
}
