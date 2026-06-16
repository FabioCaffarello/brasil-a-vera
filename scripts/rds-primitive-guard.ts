// scripts/rds-primitive-guard.ts — Guard de deprecação de primitivas locais (ADR-038).
//
// Modo de falha que este guard fecha: depois que uma primitiva local é
// consolidada no RDS (imports repontados + arquivo local removido), NADA impede
// um PR futuro de reintroduzir `import ... from '@/design-system/primitives/<x>'`
// — recriando a dupla-camada que o ADR-038 aposenta. Drift volta pela porta dos
// fundos: build verde, mas o projeto volta a manter duas versões do mesmo botão.
//
// Este guard é ESTÁTICO (não precisa de build): varre src/** e falha (exit 1) se
// algum arquivo importar de um caminho marcado como CONSOLIDADO/REMOVIDO, sempre
// apontando o substituto do RDS. Análogo ao wcag:check — parseia a fonte.
//
// A lista FORBIDDEN cresce a cada PR de consolidação (WS1/WS3/WS4): ao deletar a
// primitiva local, adiciona-se a entrada aqui NO MESMO PR. Assim o guard nunca
// fica defasado em relação ao que existe no disco.
//
// Limitação consciente: só vê o specifier LITERAL do import (`from '...'`). Import
// dinâmico montado por template escapa — fronteira aceitável (igual ao Tailwind).

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const SRC_DIR = join(ROOT, 'src')

interface Forbidden {
  /** specifier de import proibido (sem aspas), match exato */
  path: string
  /** o que usar no lugar */
  use: string
  /** ADR/PR/WS de referência para a mensagem de erro */
  ref: string
}

// Primitivas/composições já consolidadas no RDS ou órfãs slated p/ remoção.
// Uma entrada por primitiva, adicionada no PR que a remove/aposenta.
const FORBIDDEN: Forbidden[] = [
  {
    path: '@/design-system/primitives/accordion',
    use: "import { Accordion } from '@/design-system/primitives/rds-accordion'",
    ref: 'ADR-038 / WS1 — accordion local (Radix) órfã; perfis já usam o wrapper RDS',
  },
  {
    path: '@/design-system/primitives/badge',
    use: "import { Badge } from '@fabio.caffarello/react-design-system/server'",
    ref: 'ADR-038 / WS3-a — Badge consolidado no RDS (/server). Variantes RDS: primary|secondary|success|warning|error|info|neutral + style solid|outline',
  },
  {
    path: '@/design-system/primitives/label',
    use: "import { Label } from '@fabio.caffarello/react-design-system/server'",
    ref: 'ADR-038 / WS3-a — Label consolidado no RDS (/server)',
  },
  {
    path: '@/design-system/primitives/separator',
    use: "import { Separator } from '@fabio.caffarello/react-design-system/server'",
    ref: 'ADR-038 / WS3-a — Separator consolidado no RDS (/server)',
  },
  {
    path: '@/design-system/primitives/skeleton',
    use: "import { Skeleton } from '@fabio.caffarello/react-design-system/server'",
    ref: 'ADR-038 / WS3-b — Skeleton consolidado no RDS (/server, RSC-safe). Token dark via .dark do RDS (surface-muted→slate-800)',
  },
  // WS3-b/WS4 adicionam aqui: input, card, button, dialog…
  // Nota de deferimento:
  //   - input: RDS Input é client-only; repointar quebraria o zero-JS
  //     do search-form (ADR-022). Espera Input server-safe upstream.
]

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
    if (statSync(p).isDirectory()) {
      out.push(...walk(p, exts))
    } else if (exts.some((e) => name.endsWith(e))) {
      out.push(p)
    }
  }
  return out
}

// match de `from '<path>'` ou `from "<path>"` (e re-export `} from '<path>'`).
function importsForbidden(line: string, path: string): boolean {
  return (
    line.includes(`from '${path}'`) ||
    line.includes(`from "${path}"`) ||
    line.includes(`import('${path}')`) ||
    line.includes(`import("${path}")`)
  )
}

function main(): void {
  const files = walk(SRC_DIR, ['.ts', '.tsx'])
  const violations: Array<{ file: string; line: number; rule: Forbidden }> = []

  for (const file of files) {
    const rel = file.replace(`${ROOT}/`, '')
    const lines = readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, idx) => {
      for (const rule of FORBIDDEN) {
        if (importsForbidden(line, rule.path)) {
          violations.push({ file: rel, line: idx + 1, rule })
        }
      }
    })
  }

  console.log(
    `rds-primitive-guard: ${files.length} arquivos varridos; ${FORBIDDEN.length} caminho(s) de primitiva proibido(s); ${violations.length} violação(ões).`,
  )

  if (violations.length > 0) {
    console.error(
      '\nrds-primitive-guard: import de primitiva local consolidada/removida (ADR-038):',
    )
    for (const v of violations) {
      console.error(`  ✗ ${v.file}:${v.line}  importa ${v.rule.path}`)
      console.error(`      → use: ${v.rule.use}`)
      console.error(`      (${v.rule.ref})`)
    }
    console.error(
      '\nA camada local de primitivas está em deprecação ativa: a origem é o RDS.',
    )
    process.exit(1)
  }

  console.log(
    'rds-primitive-guard: OK — nenhuma primitiva consolidada reintroduzida.',
  )
}

main()
