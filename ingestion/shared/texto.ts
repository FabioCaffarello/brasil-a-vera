// Normalização de texto para exibição — auditoria UX 2026-07-20 (Onda C).
// Funções puras, aplicadas nos mappers (dado novo) e no backfill
// ingestion/ops/backfill-normaliza-texto.ts (dado já persistido).

// Caracteres espúrios que as fontes oficiais embutem em ementas/nomes:
// NOT SIGN (U+00AC — a API da Câmara devolve literalmente "Sa¬úde", soft
// hyphen corrompido na origem; verificado no payload de /proposicoes/{id}),
// soft hyphen (U+00AD), zero-widths (U+200B–U+200D), BOM (U+FEFF) e
// controles C0/C1 (exceto \n e \t). "¬" nunca é legítimo em texto
// legislativo pt-BR.
const INVISIVEIS =
  // biome-ignore lint/suspicious/noControlCharactersInRegex: o propósito é justamente remover controles
  /[\u00AC\u00AD\u200B-\u200D\uFEFF\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g

export function sanitizeTexto(s: string): string {
  return s.replace(INVISIVEIS, '').replace(/ {2,}/g, ' ').trim()
}

export function sanitizeTextoNullable(
  s: string | null | undefined,
): string | null {
  if (s === null || s === undefined) return null
  const limpo = sanitizeTexto(s)
  return limpo === '' ? null : limpo
}

// Conectivos que ficam minúsculos em nomes pt-BR (exceto na 1ª posição).
const CONECTIVOS = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])

// Numerais romanos plausíveis em nomes (Filho II, III...). "DI"/"DE" nunca
// chegam aqui — conectivos têm precedência.
const ROMANO = /^[IVX]+$/

function capitalizarSegmento(seg: string): string {
  if (seg === '') return seg
  return (seg[0] as string).toLocaleUpperCase('pt-BR') + seg.slice(1)
}

// Title-case conservador para nomes vindos TODOS em caixa alta da fonte
// ("ANDRÉ ABDON" → "André Abdon"). Nomes já em casing misto (curados na
// fonte, ex.: "AJ Albuquerque") passam intactos — o gate é ser 100% caixa
// alta. Dentro de um nome em caixa alta, tokens de até 2 letras que não são
// conectivos são tratados como iniciais e ficam maiúsculos ("JC OLIVEIRA" →
// "JC Oliveira").
export function titleCaseNome(nome: string): string {
  const limpo = sanitizeTexto(nome)
  if (limpo === '' || limpo !== limpo.toLocaleUpperCase('pt-BR')) return limpo

  return limpo
    .split(' ')
    .map((token, i) => {
      const lower = token.toLocaleLowerCase('pt-BR')
      if (i > 0 && CONECTIVOS.has(lower)) return lower
      if (ROMANO.test(token) && token.length > 1) return token
      if (token.length <= 2 && !CONECTIVOS.has(lower)) return token
      // Sub-segmentos por hífen e apóstrofo: "VILLAS-BOAS" → "Villas-Boas",
      // "D'ÁVILA" → "D'Ávila".
      return lower
        .split('-')
        .map((h) => h.split("'").map(capitalizarSegmento).join("'"))
        .join('-')
    })
    .join(' ')
}
