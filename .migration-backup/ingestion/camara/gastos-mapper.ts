import type { CamaraGasto } from './gastos-schema'

// Linha pronta para INSERT em `gastos.gasto`. Tipos explícitos (não inferidos
// do schema Drizzle) para que esta função permaneça pura e testável.
export interface GastoRow {
  sourceId: string
  parlamentarId: string
  tipo: 'CEAP'
  categoriaCodigo: number
  categoriaDescricao: string
  fornecedorNome: string
  fornecedorCnpjCpf: string | null
  valor: string
  valorGlosa: string | null
  dataEmissao: string
  urlDocumento: string | null
  trustLevel: 'L1'
  sourceUrl: string
}

export function mapCamaraGasto(
  input: CamaraGasto,
  parlamentarId: string,
  deputadoSourceId: string,
): GastoRow {
  return {
    sourceId: input.codDocumento,
    parlamentarId,
    tipo: 'CEAP',
    categoriaCodigo: input.codTipoDocumento,
    categoriaDescricao: input.tipoDespesa,
    fornecedorNome: input.nomeFornecedor,
    fornecedorCnpjCpf: input.cnpjCpfFornecedor ?? null,
    // numeric(15,2) com mode 'string' — preserva precisão decimal.
    valor: String(input.valorDocumento),
    valorGlosa: input.valorGlosa != null ? String(input.valorGlosa) : null,
    // "2025-07-16T00:00:00" → "2025-07-16" para o tipo `date` (sem tempo).
    dataEmissao: input.dataDocumento.slice(0, 10),
    urlDocumento: input.urlDocumento ?? null,
    trustLevel: 'L1',
    sourceUrl: `https://dadosabertos.camara.leg.br/api/v2/deputados/${deputadoSourceId}/despesas`,
  }
}
