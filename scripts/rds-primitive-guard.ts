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
  {
    path: '@/design-system/compositions/kpi-strip',
    use: 'import { Stat, StatGroup } from \'@fabio.caffarello/react-design-system/server\' (layout="strip")',
    ref: 'ADR-038 / WS4 — KpiStrip consolidado no Stat/StatGroup do RDS',
  },
  {
    path: '@/design-system/compositions/stats-grid',
    use: 'import { Stat, StatGroup } from \'@fabio.caffarello/react-design-system/server\' (layout="grid")',
    ref: 'ADR-038 / WS4 — StatsGrid consolidado no Stat/StatGroup do RDS',
  },
  {
    path: '@/design-system/compositions/filter-chips',
    use: "import { Chip } from '@fabio.caffarello/react-design-system/server' (container: FilterChips do RDS)",
    ref: 'ADR-038 / WS4 — FilterChip consolidado no Chip do RDS (^4, count via #222). FilterChips container já era do RDS',
  },
  {
    path: '@/design-system/primitives/input',
    use: "import { InputBase } from '@fabio.caffarello/react-design-system/server' (server-safe; NÃO o Input client do RDS, que tem hooks)",
    ref: 'ADR-038 — Input consolidado no InputBase do RDS (v4.2, server-safe via composição; RDS #224)',
  },
  {
    path: '@/design-system/compositions/combobox',
    use: "import { Autocomplete } from '@/design-system/primitives/rds-autocomplete' (wrapper bundle do RDS, com name/form do #225)",
    ref: 'ADR-038 — Combobox consolidado no Autocomplete do RDS (v4.1 name/form, RDS #225)',
  },
  {
    path: '@/design-system/primitives/command',
    use: 'usar o Autocomplete do RDS (cmdk não tem par; só compunha o Combobox local)',
    ref: 'ADR-038 — command removido junto com o Combobox local (consolidado no Autocomplete)',
  },
  {
    path: '@/design-system/primitives/popover',
    use: "import { Popover } from '@fabio.caffarello/react-design-system' se precisar; só compunha o Combobox local",
    ref: 'ADR-038 — popover removido junto com o Combobox local (consolidado no Autocomplete)',
  },
  {
    path: '@/design-system/primitives/button',
    use: "import { Button } from '@fabio.caffarello/react-design-system/server' (server-safe v4.1). Variantes: primary|secondary|error|outline|ghost|iconOnly|link; sizes sm|md|lg",
    ref: 'ADR-038 — Button consolidado no Button do RDS (v4.1 server-safe + asChild, RDS #224). default→primary, destructive→error, size=icon→variant=iconOnly',
  },
  {
    path: '@/design-system/compositions/hero-section',
    use: "import { HeroSection } from '@fabio.caffarello/react-design-system/server' (mesmas variantes plain|gradient|gradient-glow + align)",
    ref: 'ADR-038 — HeroSection consolidado no RDS (/server). Drop-in: API/variantes idênticas; prod já usava o do RDS, só o showroom restava',
  },
  {
    path: '@/design-system/primitives/dialog',
    use: "import { Dialog, DialogContent, ... } from '@/design-system/primitives/rds-dialog' (wrapper bundle do RDS; showCloseButton no DialogContent, #221)",
    ref: 'ADR-038 — Dialog consolidado no Dialog do RDS (v4, showCloseButton via #221). Sub-componentes idênticos',
  },
  {
    path: '@/design-system/primitives/sonner',
    use: "ToastProvider/ToastContainer (root layout) + useToast() de '@/design-system/primitives/rds-toast' (substituiu o sonner global pelo Toast hook-based do RDS)",
    ref: 'ADR-038 — Toast consolidado no sistema do RDS (ToastProvider+useToast); dep `sonner` removida',
  },
  {
    path: '@/design-system/primitives/card',
    use: "import { Card, CardHeader, CardTitle, CardSubtitle, CardBody, CardActions } from '@fabio.caffarello/react-design-system/server' (CardContent→CardBody, CardDescription→CardSubtitle, CardFooter→CardActions)",
    ref: 'ADR-038 — Card consolidado no Card compound do RDS (/server). Card/CardHeader/CardTitle iguais; renames de sub-componentes',
  },
  {
    path: '@/design-system/compositions/data-badge',
    use: "import { DataBadge } from '@fabio.caffarello/react-design-system/server' (label/source/icon/tone; tones default→neutral, destructive→error, brand→primary, accent→dataviz [roxo data-viz, NÃO o accent ciano do RDS])",
    ref: 'ADR-038 — DataBadge consolidado no RDS (v4.5, /server, superset RSC-safe). Vocabulário de tom remapeado',
  },
  {
    path: '@/design-system/compositions/kpi-card',
    use: 'import { Stat, StatGroup } from \'@fabio.caffarello/react-design-system/server\'. Cada item vira <Stat icon value label align="center" />; o wrapper vira <StatGroup layout="grid" cols={4} floatingBadge={...}> (use grid p/ colapso 2-up→4 no md)',
    ref: 'ADR-038 — KpiCard consolidado no StatGroup do RDS (v4.6, /server). Slot floatingBadge entregue na RDS #245 destravou o TrustBadge L1 flutuante',
  },
  {
    path: '@/design-system/primitives/tabs',
    use: 'se precisar de navegação por links, use TabsAsLinks do RDS; tabs com estado interno é gap do RDS — abrir issue/gap, NÃO recriar primitiva local',
    ref: 'ADR-038 — tabs local removido como órfão (único consumer era o showroom /dev/design, eliminado). Zera a camada de primitivos locais',
  },
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
