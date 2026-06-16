// scripts/wcag-check.ts — Gate de contraste WCAG (issue #362).
//
// Dano comprovado: o PR #361 embarcou 3 regressões WCAG AA no tema dark que
// ficaram em `main` por 3 dias (`--primary` a 3.28:1 → texto de botão ilegível).
// A única ferramenta de contraste era `.local/wcag-check.ts` — gitignored, fora
// do CI, e com valores HARDCODED que driftaram: no #361 validava cores que já
// não renderizavam há ~3 dias ("gate validando ficção"). Mesma classe do #416.
//
// Este gate elimina o drift POR CONSTRUÇÃO: parseia os tokens reais de
// `src/app/globals.css` (blocos `:root` light + `.dark` + a escala navy do
// `@theme inline`), resolve `var(--color-primary-*)`, e computa o contraste
// WCAG 2.1 (culori) sobre os valores RENDERIZADOS. Token ausente do globals →
// falha dura (nunca valida ficção). Falha AA (body ≥4.5, ui ≥3.0) → exit 1; AAA
// é advisory. Roda no CI (job "Contrast / WCAG", todos os PRs) via
// `npm run wcag:check`, e é exercitado por `scripts/wcag-check.test.ts` (prova
// que pega o cenário #361 — "verde só vale com vermelho demonstrado").

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { formatHex, parse, wcagContrast } from 'culori'

const GLOBALS_PATH = join(process.cwd(), 'src/app/globals.css')

export type Kind = 'body' | 'ui' | 'decorative'
export type Theme = 'light' | 'dark'

export interface Pair {
  label: string
  // `fg`/`bg` são CHAVES de token (nome da CSS var sem `--`), não valores —
  // por isso os pares não driftam quando uma cor muda. Resolvidos por tema.
  fg: string
  bg: string
  // body = texto regular (WCAG 1.4.3, AA ≥ 4.5); ui = componente/boundary
  // (1.4.11, AA ≥ 3.0); decorative = divisor sem função (sem requisito).
  kind: Kind
  theme: Theme
}

export interface Tokens {
  light: Map<string, string>
  dark: Map<string, string>
}

const THRESHOLDS: Record<Kind, { aa: number; aaa: number }> = {
  body: { aa: 4.5, aaa: 7 },
  ui: { aa: 3, aaa: 4.5 },
  decorative: { aa: 0, aaa: 0 },
}

// Pares portados da auditoria Sprint 4.0 + accent Wave 6 (ADR-024). Estruturais:
// referenciam nomes de token, não valores.
export const PAIRS: Pair[] = [
  // ===== LIGHT =====
  {
    label: 'foreground / background',
    fg: 'foreground',
    bg: 'background',
    kind: 'body',
    theme: 'light',
  },
  {
    label: 'foreground / surface',
    fg: 'foreground',
    bg: 'surface',
    kind: 'body',
    theme: 'light',
  },
  {
    label: 'foreground-muted / background',
    fg: 'foreground-muted',
    bg: 'background',
    kind: 'body',
    theme: 'light',
  },
  {
    label: 'foreground-muted / surface',
    fg: 'foreground-muted',
    bg: 'surface',
    kind: 'body',
    theme: 'light',
  },
  {
    label: 'foreground-subtle / background',
    fg: 'foreground-subtle',
    bg: 'background',
    kind: 'body',
    theme: 'light',
  },
  {
    label: 'foreground-subtle / surface',
    fg: 'foreground-subtle',
    bg: 'surface',
    kind: 'body',
    theme: 'light',
  },
  {
    label: 'primary-foreground / primary (button)',
    fg: 'primary-foreground',
    bg: 'primary',
    kind: 'body',
    theme: 'light',
  },
  {
    label: 'primary / background (link)',
    fg: 'primary',
    bg: 'background',
    kind: 'body',
    theme: 'light',
  },
  {
    label: 'primary / surface (link em card)',
    fg: 'primary',
    bg: 'surface',
    kind: 'body',
    theme: 'light',
  },
  {
    label: 'success-foreground / success (badge)',
    fg: 'success-foreground',
    bg: 'success',
    kind: 'body',
    theme: 'light',
  },
  {
    label: 'warning-foreground / warning (badge)',
    fg: 'warning-foreground',
    bg: 'warning',
    kind: 'body',
    theme: 'light',
  },
  {
    label: 'destructive-foreground / destructive (badge)',
    fg: 'destructive-foreground',
    bg: 'destructive',
    kind: 'body',
    theme: 'light',
  },
  {
    label: 'ring / background (focus ring UI)',
    fg: 'ring',
    bg: 'background',
    kind: 'ui',
    theme: 'light',
  },
  {
    label: 'border / background (divisor decorativo)',
    fg: 'border',
    bg: 'background',
    kind: 'decorative',
    theme: 'light',
  },
  {
    label: 'border-strong / background (divisor decorativo)',
    fg: 'border-strong',
    bg: 'background',
    kind: 'decorative',
    theme: 'light',
  },
  {
    label: 'accent / background (link narrativo)',
    fg: 'accent',
    bg: 'background',
    kind: 'body',
    theme: 'light',
  },
  {
    label: 'accent / surface (chip narrativo)',
    fg: 'accent',
    bg: 'surface',
    kind: 'body',
    theme: 'light',
  },
  {
    label: 'accent-foreground / accent (badge)',
    fg: 'accent-foreground',
    bg: 'accent',
    kind: 'body',
    theme: 'light',
  },

  // ===== DARK =====
  {
    label: 'foreground / background',
    fg: 'foreground',
    bg: 'background',
    kind: 'body',
    theme: 'dark',
  },
  {
    label: 'foreground / surface',
    fg: 'foreground',
    bg: 'surface',
    kind: 'body',
    theme: 'dark',
  },
  {
    label: 'foreground / surface-elevated',
    fg: 'foreground',
    bg: 'surface-elevated',
    kind: 'body',
    theme: 'dark',
  },
  {
    label: 'foreground-muted / background',
    fg: 'foreground-muted',
    bg: 'background',
    kind: 'body',
    theme: 'dark',
  },
  {
    label: 'foreground-muted / surface',
    fg: 'foreground-muted',
    bg: 'surface',
    kind: 'body',
    theme: 'dark',
  },
  {
    label: 'foreground-subtle / background',
    fg: 'foreground-subtle',
    bg: 'background',
    kind: 'body',
    theme: 'dark',
  },
  {
    label: 'foreground-subtle / surface',
    fg: 'foreground-subtle',
    bg: 'surface',
    kind: 'body',
    theme: 'dark',
  },
  {
    label: 'primary-foreground / primary (button)',
    fg: 'primary-foreground',
    bg: 'primary',
    kind: 'body',
    theme: 'dark',
  },
  {
    label: 'primary / background (link)',
    fg: 'primary',
    bg: 'background',
    kind: 'body',
    theme: 'dark',
  },
  {
    label: 'primary / surface (link em card)',
    fg: 'primary',
    bg: 'surface',
    kind: 'body',
    theme: 'dark',
  },
  {
    label: 'success-foreground / success (badge)',
    fg: 'success-foreground',
    bg: 'success',
    kind: 'body',
    theme: 'dark',
  },
  {
    label: 'warning-foreground / warning (badge)',
    fg: 'warning-foreground',
    bg: 'warning',
    kind: 'body',
    theme: 'dark',
  },
  {
    label: 'destructive-foreground / destructive (badge)',
    fg: 'destructive-foreground',
    bg: 'destructive',
    kind: 'body',
    theme: 'dark',
  },
  {
    label: 'ring / background (focus ring UI)',
    fg: 'ring',
    bg: 'background',
    kind: 'ui',
    theme: 'dark',
  },
  {
    label: 'border / background (divisor decorativo)',
    fg: 'border',
    bg: 'background',
    kind: 'decorative',
    theme: 'dark',
  },
  {
    label: 'border-strong / background (divisor decorativo)',
    fg: 'border-strong',
    bg: 'background',
    kind: 'decorative',
    theme: 'dark',
  },
  {
    label: 'accent / background (link narrativo)',
    fg: 'accent',
    bg: 'background',
    kind: 'body',
    theme: 'dark',
  },
  {
    label: 'accent / surface (chip narrativo)',
    fg: 'accent',
    bg: 'surface',
    kind: 'body',
    theme: 'dark',
  },
  {
    label: 'accent / surface-elevated (chip em CTA)',
    fg: 'accent',
    bg: 'surface-elevated',
    kind: 'body',
    theme: 'dark',
  },
  {
    label: 'accent-foreground / accent (badge)',
    fg: 'accent-foreground',
    bg: 'accent',
    kind: 'body',
    theme: 'dark',
  },
]

// Acha o corpo do PRIMEIRO bloco aberto por `openRe` (assume sem chaves
// aninhadas — verdadeiro para :root/.dark/@theme após strip de comentários).
function matchBlockBody(css: string, openRe: RegExp): string | null {
  const m = openRe.exec(css)
  if (!m) return null
  const start = m.index + m[0].length
  const end = css.indexOf('}', start)
  return end === -1 ? null : css.slice(start, end)
}

function* allBlockBodies(css: string, openSource: string): Generator<string> {
  const re = new RegExp(openSource, 'g')
  let m: RegExpExecArray | null = re.exec(css)
  while (m !== null) {
    const start = m.index + m[0].length
    const end = css.indexOf('}', start)
    if (end !== -1) yield css.slice(start, end)
    m = re.exec(css)
  }
}

function collectDecls(body: string, into: Map<string, string>): void {
  for (const m of body.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    into.set(m[1], m[2].trim())
  }
}

function resolveValue(
  value: string,
  scope: Map<string, string>,
  navy: Map<string, string>,
  depth = 0,
): string {
  const v = value.trim()
  const m = /^var\(\s*--([a-z0-9-]+)\s*\)$/.exec(v)
  if (!m || depth > 6) return v
  const ref = navy.get(m[1]) ?? scope.get(m[1])
  return ref === undefined ? v : resolveValue(ref, scope, navy, depth + 1)
}

function resolveAll(
  scope: Map<string, string>,
  navy: Map<string, string>,
): void {
  for (const [k, v] of scope) scope.set(k, resolveValue(v, scope, navy))
}

export function parseTokens(css: string): Tokens {
  // 1. strip comentários CSS (podem conter `;`/`}` em prosa).
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '')
  // 2. remove o bloco @media (prefers-color-scheme: dark) { :root { ... } } —
  //    duplicata byte-idêntica do `.dark`; deixá-lo poluiria o mapa LIGHT (o
  //    `:root` dele tem valores dark). Sem chaves aninhadas além do :root único.
  const noMedia = clean.replace(
    /@media[^{]*prefers-color-scheme:\s*dark[^{]*\{\s*:root\s*\{[^{}]*\}\s*\}/g,
    '',
  )
  // 3. escala navy do @theme inline (--color-primary-N: #hex).
  const navy = new Map<string, string>()
  const themeBody = matchBlockBody(noMedia, /@theme[^{]*\{/)
  if (themeBody) {
    for (const m of themeBody.matchAll(
      /--(color-primary-\d+)\s*:\s*(#[0-9a-fA-F]+)/g,
    )) {
      navy.set(m[1], m[2])
    }
  }
  // 4. LIGHT = merge de todos os :root { ... } top-level (o do @media já saiu).
  const light = new Map<string, string>()
  for (const body of allBlockBodies(noMedia, ':root\\s*\\{'))
    collectDecls(body, light)
  // 5. DARK = bloco .dark { ... }.
  const dark = new Map<string, string>()
  const darkBody = matchBlockBody(noMedia, /\.dark\s*\{/)
  if (darkBody) collectDecls(darkBody, dark)
  // 6. resolve var(--…) em cada tema (navy ∪ próprio mapa).
  resolveAll(light, navy)
  resolveAll(dark, navy)
  return { light, dark }
}

export type Status = 'AAA' | 'AA' | 'FAIL' | 'N/A' | 'MISSING'

export interface Result {
  pair: Pair
  ratio: number | null
  fgColor?: string
  bgColor?: string
  status: Status
  missing: string[]
}

export function evaluate(tokens: Tokens, pairs: Pair[] = PAIRS): Result[] {
  return pairs.map((pair) => {
    const scope = tokens[pair.theme]
    const fgColor = scope.get(pair.fg)
    const bgColor = scope.get(pair.bg)
    const missing: string[] = []
    // Token ausente OU cor inválida (var() não resolvido / typo) → falha dura.
    if (fgColor === undefined || !parse(fgColor)) missing.push(pair.fg)
    if (bgColor === undefined || !parse(bgColor)) missing.push(pair.bg)
    if (missing.length > 0) {
      return { pair, ratio: null, fgColor, bgColor, status: 'MISSING', missing }
    }
    const ratio = wcagContrast(fgColor as string, bgColor as string)
    if (pair.kind === 'decorative') {
      return { pair, ratio, fgColor, bgColor, status: 'N/A', missing }
    }
    const t = THRESHOLDS[pair.kind]
    const status: Status =
      ratio >= t.aaa ? 'AAA' : ratio >= t.aa ? 'AA' : 'FAIL'
    return { pair, ratio, fgColor, bgColor, status, missing }
  })
}

// Falhas bloqueantes: abaixo de AA, ou token ausente/cor inválida.
export function failures(results: Result[]): Result[] {
  return results.filter((r) => r.status === 'FAIL' || r.status === 'MISSING')
}

function srgb(color?: string): string {
  if (!color) return '—'
  const p = parse(color)
  return p ? (formatHex(p) ?? color) : color
}

function statusLabel(r: Result): string {
  switch (r.status) {
    case 'AAA':
      return 'AAA ✅'
    case 'AA':
      return 'AA ✅'
    case 'N/A':
      return 'N/A (decorativo)'
    case 'MISSING':
      return `MISSING (${r.missing.join(', ')}) ❌`
    default:
      return 'FAIL ❌'
  }
}

function main(): void {
  const css = readFileSync(GLOBALS_PATH, 'utf8')
  const results = evaluate(parseTokens(css))

  console.log('# WCAG 2.1 contrast gate — tokens reais de src/app/globals.css')
  console.log('Threshold body: AA ≥ 4.5, AAA ≥ 7.0 · UI: AA ≥ 3.0, AAA ≥ 4.5')
  console.log('')
  for (const theme of ['light', 'dark'] as const) {
    console.log(`## ${theme.toUpperCase()}`)
    console.log('| Par | fg → bg (sRGB) | Ratio | Kind | Status |')
    console.log('|---|---|---:|---|---|')
    for (const r of results.filter((x) => x.pair.theme === theme)) {
      const ratio = r.ratio === null ? '—' : r.ratio.toFixed(2)
      console.log(
        `| ${r.pair.label} | ${srgb(r.fgColor)} → ${srgb(r.bgColor)} | ${ratio} | ${r.pair.kind} | ${statusLabel(r)} |`,
      )
    }
    console.log('')
  }

  const fails = failures(results)
  if (fails.length === 0) {
    console.log(
      '✅ Todos os pares passam WCAG AA (tokens reais do globals.css).',
    )
    process.exit(0)
  }
  console.error(
    `\n❌ ${fails.length} par(es) abaixo de AA ou com token ausente:`,
  )
  for (const f of fails) {
    if (f.status === 'MISSING') {
      console.error(
        `  ✗ [${f.pair.theme}] ${f.pair.label}: token(s) ausente(s)/inválido(s): ${f.missing.join(', ')}`,
      )
    } else {
      console.error(
        `  ✗ [${f.pair.theme}] ${f.pair.label}: ${f.ratio?.toFixed(2)} < ${THRESHOLDS[f.pair.kind].aa}`,
      )
    }
  }
  console.error(
    '\nCorrija o token em src/app/globals.css. Gate da issue #362 — impede regressão AA silenciosa (incidente #361).',
  )
  process.exit(1)
}

// Roda main() só quando executado direto (`tsx scripts/wcag-check.ts`), não
// quando importado pelo teste vitest.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
}
