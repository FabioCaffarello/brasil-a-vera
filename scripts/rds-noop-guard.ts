// scripts/rds-noop-guard.ts — Guard de no-op de classe RDS (Fase B / ADR-034).
//
// Modo de falha que este guard fecha (incidente #303/#304, redux Fase B):
// classes utilitárias do RDS (`text-fg-primary`, `bg-surface-canvas`,
// `ring-line-focus`, `bg-fg-brand/10`…) escritas no JSX do BaV só resolvem se
// o token estiver no bridge do @theme (src/app/globals.css) E a classe for
// captada pelo Tailwind. Um token RDS NÃO bridado (ex.: `icon-brand`,
// `divider`) usado numa className gera classe SEM regra — no-op silencioso:
// build verde, elemento sem cor. Este guard roda DEPOIS do build e falha
// (exit 1) se alguma classe que referencia um token semântico do RDS aparecer
// em src/** mas não tiver regra no CSS gerado (.next/static/**/*.css).
//
// É o contrafactual-provável que torna o "auto-merge on green" seguro para a
// Fase B: o vermelho aparece exatamente quando uma tradução produziria no-op.
//
// Limitação consciente: só vê classes LITERAIS em strings (igual ao scanner do
// próprio Tailwind). Classe montada dinamicamente (template/cn condicional)
// escapa — mesma fronteira do Tailwind, aceitável.

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const RDS_CSS = join(
  ROOT,
  'node_modules/@fabio.caffarello/react-design-system/dist/react-design-system.css',
)
const SRC_DIR = join(ROOT, 'src')
const BUILD_CSS_DIRS = [
  join(ROOT, '.next/static'),
  join(ROOT, '.open-next/assets'),
]

// Prefixos de utility que recebem cor (os usados no projeto + folga segura).
const COLOR_PREFIXES = [
  'text',
  'bg',
  'border',
  'ring',
  'ring-offset',
  'fill',
  'stroke',
  'outline',
  'divide',
  'decoration',
  'caret',
  'accent',
  'placeholder',
  'from',
  'via',
  'to',
  'shadow',
]

// Famílias de cor cru do Tailwind (BaV já tem; não são "RDS-únicas").
const RAW_PALETTE =
  /^(amber|blue|cyan|emerald|gray|green|indigo|lime|neutral|orange|pink|purple|red|rose|sky|slate|stone|teal|violet|yellow|zinc|black|white|fuchsia)(-|$)/

function walk(dir: string, exts: string[]): string[] {
  const out: string[] = []
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return out
  }
  for (const name of entries) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) {
      out.push(...walk(p, exts))
    } else if (exts.some((e) => name.endsWith(e))) {
      out.push(p)
    }
  }
  return out
}

// 1. Conjunto de tokens semânticos do RDS (todos os --color-* menos paleta crua).
function rdsSemanticTokens(): Set<string> {
  const css = readFileSync(RDS_CSS, 'utf8')
  const set = new Set<string>()
  for (const m of css.matchAll(/--color-([a-z0-9-]+)\s*:/g)) {
    const tok = m[1]
    if (!RAW_PALETTE.test(tok)) set.add(tok)
  }
  return set
}

// 2. Classes RDS-únicas (literais) usadas em src/**, com prefixo de variante.
//    Ex.: "hover:bg-fg-brand/5", "focus-visible:ring-line-focus", "text-fg-primary".
function usedRdsClasses(tokens: Set<string>): Map<string, string> {
  // class -> primeiro arquivo onde apareceu (para mensagem de erro)
  const used = new Map<string, string>()
  const prefixAlt = COLOR_PREFIXES.join('|')
  // (variantes:)* (prefixo)-(token)(/opacidade)?  — token validado contra o set RDS depois.
  const re = new RegExp(
    `(?:[a-z][a-z0-9-]*:)*(?:${prefixAlt})-[a-z0-9-]+(?:/[0-9]+)?`,
    'g',
  )
  for (const file of walk(SRC_DIR, ['.tsx', '.ts'])) {
    const txt = readFileSync(file, 'utf8')
    for (const m of txt.matchAll(re)) {
      const cls = m[0]
      // separa variantes do utilitário base
      const base = cls.slice(cls.lastIndexOf(':') + 1) // "bg-fg-brand/5"
      const noOpacity = base.split('/')[0] // "bg-fg-brand"
      // remove o prefixo de propriedade para obter o token de cor
      const prefix = COLOR_PREFIXES.find((p) => noOpacity.startsWith(`${p}-`))
      if (!prefix) continue
      const token = noOpacity.slice(prefix.length + 1) // "fg-brand"
      if (!tokens.has(token)) continue // não é token RDS — ignora (BaV / cru)
      if (!used.has(cls)) used.set(cls, file.replace(`${ROOT}/`, ''))
    }
  }
  return used
}

// 3. CSS gerado pelo build, concatenado.
function builtCss(): string {
  const parts: string[] = []
  for (const dir of BUILD_CSS_DIRS) {
    for (const f of walk(dir, ['.css'])) parts.push(readFileSync(f, 'utf8'))
  }
  return parts.join('\n')
}

// selector escapado do Tailwind para a classe (só `:` e `/` relevantes aqui).
function escapedSelector(cls: string): string {
  return `.${cls.replace(/:/g, '\\:').replace(/\//g, '\\/')}`
}

// regra existe se o selector aparece seguido de fronteira ({ , : \ espaço).
function hasRule(css: string, cls: string): boolean {
  const sel = escapedSelector(cls)
  let i = css.indexOf(sel)
  while (i !== -1) {
    const next = css[i + sel.length]
    if (next === undefined || '{,: \n\\>+~'.includes(next)) return true
    i = css.indexOf(sel, i + 1)
  }
  return false
}

// 4. Cor inválida `hsl(var(--token))` em src/** (incidente #303/#304).
//    Todos os tokens de cor do projeto são OKLCH; `hsl(var(--x))` expande p/
//    `hsl(oklch(...))` — CSS inválido, fill/cor cai pro default (preto). O #304
//    corrigiu 30 ocorrências mas pode reincidir (charts colados de exemplos
//    HSL). A correção é sempre `var(--x)` direto (ou color-mix(in oklch, ...)).
function invalidHslVar(): string[] {
  const hits: string[] = []
  for (const file of walk(SRC_DIR, ['.tsx', '.ts', '.css'])) {
    const lines = readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, idx) => {
      const m = /hsl\(\s*var\(/.exec(line)
      if (!m) return
      // Ignora menções em comentário (mesma convenção do design-token-check):
      // linha de comentário (// ... | * ... | /* ...) ou `//` antes do match.
      const trimmed = line.trimStart()
      if (/^(\/\/|\*|\/\*)/.test(trimmed)) return
      const slashes = line.indexOf('//')
      if (slashes !== -1 && slashes < m.index) return
      hits.push(`${file.replace(`${ROOT}/`, '')}:${idx + 1}`)
    })
  }
  return hits
}

// 5. Invariante de cascade-layer do bridge RDS (ADR-034 §6).
//    O CSS do RDS é importado em `@layer rds`, declarada como PRIMEIRA layer
//    (menor prioridade), para que as utilities do BaV (layer `utilities` padrão
//    do Tailwind) vençam as utilities genéricas pré-compiladas do RDS (`.hidden`,
//    `.flex`…). Sem isso, `.hidden{display:none}` do RDS sobrescreve
//    `@media{.sm:block}` do BaV e `hidden sm:block` colapsa para display:none no
//    desktop — perfis com o miolo inteiro invisível (bug latente desde #405).
//    Esta checagem trava a invariante na FONTE: se alguém remover a declaração
//    `@layer rds;` ou o `layer(rds)` do import, falha aqui (não depende do build).
function cascadeLayerInvariant(): string[] {
  const errs: string[] = []
  const code = readFileSync(join(ROOT, 'src/app/globals.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g, // remove comentários CSS (não casar menções em prosa)
    '',
  )
  if (!/@layer\s+rds\s*;/.test(code)) {
    errs.push('falta a declaração `@layer rds;` (a layer de menor prioridade)')
  }
  if (
    !/@import\s+["'][^"']*react-design-system\/styles["']\s+layer\(\s*rds\s*\)/.test(
      code,
    )
  ) {
    errs.push('o @import do CSS do RDS precisa usar `layer(rds)`')
  }
  return errs
}

function main() {
  const tokens = rdsSemanticTokens()
  const used = usedRdsClasses(tokens)
  const layer = cascadeLayerInvariant()
  const css = builtCss()

  if (!css) {
    console.error(
      'rds-noop-guard: nenhum CSS de build encontrado em .next/static — rode `npm run build` antes.',
    )
    process.exit(2)
  }

  const noops: Array<[string, string]> = []
  for (const [cls, file] of used) {
    if (!hasRule(css, cls)) noops.push([cls, file])
  }
  const hsl = invalidHslVar()

  console.log(
    `rds-noop-guard: ${used.size} classes RDS verificadas contra o CSS gerado (${tokens.size} tokens semânticos do pacote); ${hsl.length} ocorrência(s) de hsl(var()); invariante de cascade-layer ${layer.length === 0 ? 'OK' : 'QUEBRADA'}.`,
  )

  let failed = false

  if (layer.length > 0) {
    failed = true
    console.error(
      '\nrds-noop-guard: invariante de cascade-layer do bridge quebrada (ADR-034 §6):',
    )
    for (const e of layer) console.error(`  ✗ ${e}`)
    console.error(
      'Sem ela, `hidden sm:block` colapsa para display:none no desktop (perfis com o miolo invisível).',
    )
  }

  if (noops.length > 0) {
    failed = true
    console.error(
      `\nrds-noop-guard: ${noops.length} classe(s) RDS usada(s) SEM regra no CSS (no-op silencioso):`,
    )
    for (const [cls, file] of noops.sort()) {
      console.error(`  ✗ ${cls}   (${file})`)
    }
    console.error(
      'Correção: bride o token em src/app/globals.css (@theme inline) ou troque a',
    )
    console.error(
      'classe pela equivalente da tabela docs/migration/token-map.md.',
    )
  }

  if (hsl.length > 0) {
    failed = true
    console.error(
      `\nrds-noop-guard: ${hsl.length} cor(es) inválida(s) hsl(var(--token)) — tokens são OKLCH, hsl(oklch()) é CSS inválido (preto). Incidente #303/#304:`,
    )
    for (const loc of hsl) console.error(`  ✗ ${loc}`)
    console.error(
      'Correção: use var(--token) direto, ou color-mix(in oklch, ...).',
    )
  }

  if (failed) {
    console.error(
      '\nAmbas as falhas são "build verde, visual quebrado" — a classe que o guard fecha.',
    )
    process.exit(1)
  }
  console.log(
    'rds-noop-guard: OK — classes RDS resolvem e nenhuma cor inválida.',
  )
}

main()
