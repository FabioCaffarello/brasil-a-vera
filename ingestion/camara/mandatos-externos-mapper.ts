import type { MandatoExternoItem } from './mandatos-externos-schema'

export interface MandatoExternoRow {
  parlamentarId: string
  cargo: string
  siglaUf: string | null
  municipio: string | null
  anoInicio: number | null
  anoFim: number | null
  siglaPartidoEleicao: string | null
  sourceUrl: string
}

function parseAno(raw: string | null | undefined): number | null {
  if (!raw) return null
  const n = parseInt(raw, 10)
  return Number.isFinite(n) ? n : null
}

export function mapMandatosExternos(
  parlamentarId: string,
  items: MandatoExternoItem[],
  sourceUrl: string,
): MandatoExternoRow[] {
  return items.map((item) => ({
    parlamentarId,
    cargo: item.cargo.trim(),
    siglaUf: item.siglaUf?.trim() || null,
    municipio: item.municipio?.trim() || null,
    anoInicio: parseAno(item.anoInicio),
    anoFim: parseAno(item.anoFim),
    siglaPartidoEleicao: item.siglaPartidoEleicao?.trim() || null,
    sourceUrl,
  }))
}
