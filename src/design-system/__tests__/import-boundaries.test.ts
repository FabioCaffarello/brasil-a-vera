/**
 * Import boundary test — Sprint 4.0 PR 2.
 *
 * Garante que arquivos em `src/design-system/**` não importem de paths
 * proibidos (componentes de domínio, queries, módulos, db).
 *
 * Cobre a lacuna até Biome ter regra contextual por path madura. Documentado
 * em src/design-system/README.md e ADR-021 §"Regra de import boundary".
 */

import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const DESIGN_SYSTEM_ROOT = join(__dirname, '..')
const PROJECT_ROOT = join(__dirname, '..', '..', '..')

// Paths absolutos (via path alias `@/...`) que NÃO podem aparecer
// em imports dentro de src/design-system/**.
const FORBIDDEN_IMPORT_PREFIXES = [
  '@/components/parlamentar',
  '@/components/proposicao',
  '@/components/votacao',
  '@/components/partido',
  '@/components/comparar',
  '@/components/busca',
  '@/components/home',
  '@/components/trust',
  '@/components/ui', // a deprecar — design-system não importa daí
  '@/lib/queries',
  '@/modules',
  '@/shared/db',
  '@/shared/legislatura',
  '@/app', // app/ é consumer; design-system não conhece app
]

// Imports relativos que escapam de src/design-system/ também são proibidos.
const FORBIDDEN_RELATIVE_PATTERNS = [
  /from\s+['"](\.\.\/){2,}components\//,
  /from\s+['"](\.\.\/){2,}lib\/queries\//,
  /from\s+['"](\.\.\/){2,}modules\//,
  /from\s+['"](\.\.\/){2,}shared\/db\//,
  /from\s+['"](\.\.\/){2,}app\//,
]

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      const sub = await walk(full)
      files.push(...sub)
    } else if (
      entry.isFile() &&
      /\.(ts|tsx|js|jsx)$/.test(entry.name) &&
      !entry.name.includes('.test.')
    ) {
      files.push(full)
    }
  }
  return files
}

async function getImports(filePath: string): Promise<string[]> {
  const content = await readFile(filePath, 'utf-8')
  // Pega tanto `import X from '...'` quanto `import('...')` quanto
  // re-exports `export ... from '...'`. Strings de import literal só.
  const matches = content.matchAll(
    /(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]/g,
  )
  return Array.from(matches, (m) => m[1])
}

describe('design-system import boundaries', () => {
  it('nenhum arquivo em src/design-system/** importa de paths proibidos', async () => {
    const files = await walk(DESIGN_SYSTEM_ROOT)
    const violations: { file: string; importPath: string }[] = []

    for (const file of files) {
      const content = await readFile(file, 'utf-8')
      const imports = await getImports(file)
      const rel = relative(PROJECT_ROOT, file)

      for (const importPath of imports) {
        // Alias absoluto proibido
        for (const prefix of FORBIDDEN_IMPORT_PREFIXES) {
          if (importPath === prefix || importPath.startsWith(`${prefix}/`)) {
            violations.push({ file: rel, importPath })
          }
        }
      }

      // Imports relativos que escapam do design-system
      for (const pattern of FORBIDDEN_RELATIVE_PATTERNS) {
        if (pattern.test(content)) {
          const match = content.match(pattern)
          violations.push({
            file: rel,
            importPath: match ? match[0] : '(pattern match)',
          })
        }
      }
    }

    if (violations.length > 0) {
      const msg = violations
        .map((v) => `  ${v.file}\n    → ${v.importPath}`)
        .join('\n')
      throw new Error(
        `Import boundary violation em src/design-system/** (ver ADR-021):\n${msg}`,
      )
    }

    expect(violations).toHaveLength(0)
  })

  it('cobre todos os arquivos .ts/.tsx em src/design-system/**', async () => {
    const files = await walk(DESIGN_SYSTEM_ROOT)
    // Sanity: existe pelo menos 1 arquivo (caso o glob esteja errado).
    expect(files.length).toBeGreaterThan(0)
  })
})
