import Link from 'next/link'

import {
  FilterChip,
  FilterChips,
} from '@/design-system/compositions/filter-chips'
import { Button } from '@/design-system/primitives/button'
import { Label } from '@/design-system/primitives/label'
import type { OrdemListagem } from '@/lib/queries/parlamentares'

interface Props {
  partidos: string[]
  ufs: string[]
  selecionado: {
    casa?: string
    partido?: string
    uf?: string
    q?: string
    ordem?: OrdemListagem
  }
}

const INPUT_CLASS =
  'min-h-[44px] rounded-md border border-border-strong bg-background px-2 py-1.5 text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

const ORDEM_LABEL: Record<OrdemListagem, string> = {
  nome: 'Nome (A→Z)',
  alinhamento: 'Maior alinhamento',
  gasto: 'Maior gasto',
  proposicoes: 'Mais proposições',
}

/**
 * Helper interno: constrói href de filtro mantendo os outros filtros
 * ativos. Override com `null` remove o filtro do URL.
 *
 * Uso (Sprint 6.2 PR 1 — Wave 6):
 *   buildHref({ casa: 'CAMARA' }, { casa: 'SENADO' }) → '/parlamentares?casa=SENADO'
 *   buildHref({ casa: 'CAMARA', uf: 'SP' }, { casa: null }) → '/parlamentares?uf=SP'
 *
 * Wave 7 Sprint 7.1 PR2: preserva também q e ordem.
 */
function buildHref(
  current: Props['selecionado'],
  overrides: Partial<Record<keyof Props['selecionado'], string | null>>,
): string {
  const merged: Record<string, string | undefined | null> = {
    ...current,
    ...overrides,
  }
  const params = new URLSearchParams()
  for (const key of ['casa', 'partido', 'uf', 'q', 'ordem'] as const) {
    const value = merged[key]
    if (value !== null && value !== undefined && value !== '') {
      params.set(key, value)
    }
  }
  const query = params.toString()
  return query ? `/parlamentares?${query}` : '/parlamentares'
}

/**
 * Filtros de parlamentares — Sprint 6.2 PR 1 (Wave 6, reskin listagens).
 *
 * Hybrid pragmático (D1 do plano Sprint 6.2):
 * - **Casa** (3 opções: Todas, Câmara, Senado): FilterChips com Links
 *   que preservam outros filtros (Partido/UF). URL=state, sem JS client.
 * - **Partido** (~30 opções) + **UF** (27 estados): mantém `<select>`
 *   nativo em form GET — chips quebrariam mobile com tantas opções.
 *
 * Form GET mantido para Partido/UF (Filtrar/Limpar buttons). Casa fora
 * do form (chips Links instant click). Visualmente unificado num único
 * container.
 */
export function Filtros({ partidos, ufs, selecionado }: Props) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <FilterChips label="Casa">
        <FilterChip asChild selected={!selecionado.casa}>
          <Link href={buildHref(selecionado, { casa: null })}>Todas</Link>
        </FilterChip>
        <FilterChip asChild selected={selecionado.casa === 'CAMARA'}>
          <Link href={buildHref(selecionado, { casa: 'CAMARA' })}>Câmara</Link>
        </FilterChip>
        <FilterChip asChild selected={selecionado.casa === 'SENADO'}>
          <Link href={buildHref(selecionado, { casa: 'SENADO' })}>Senado</Link>
        </FilterChip>
      </FilterChips>

      <form
        action="/parlamentares"
        className="space-y-3 border-border border-t pt-4"
        method="get"
      >
        {selecionado.casa ? (
          <input name="casa" type="hidden" value={selecionado.casa} />
        ) : null}

        {/* Busca por nome (Sprint 7.1 PR2) — SSR puro, Enter submete. */}
        <div className="flex flex-col gap-1">
          <Label className="text-foreground-muted text-xs" htmlFor="filtro-q">
            Buscar por nome
          </Label>
          <input
            className={INPUT_CLASS}
            defaultValue={selecionado.q ?? ''}
            id="filtro-q"
            name="q"
            placeholder="Ex.: silva"
            type="search"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <Label
              className="text-foreground-muted text-xs"
              htmlFor="filtro-partido"
            >
              Partido
            </Label>
            <select
              className={INPUT_CLASS}
              defaultValue={selecionado.partido ?? ''}
              id="filtro-partido"
              name="partido"
            >
              <option value="">Todos</option>
              {partidos.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <Label
              className="text-foreground-muted text-xs"
              htmlFor="filtro-uf"
            >
              UF
            </Label>
            <select
              className={INPUT_CLASS}
              defaultValue={selecionado.uf ?? ''}
              id="filtro-uf"
              name="uf"
            >
              <option value="">Todas</option>
              {ufs.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <Label
              className="text-foreground-muted text-xs"
              htmlFor="filtro-ordem"
            >
              Ordenar por
            </Label>
            <select
              className={INPUT_CLASS}
              defaultValue={selecionado.ordem ?? 'nome'}
              id="filtro-ordem"
              name="ordem"
            >
              {(Object.keys(ORDEM_LABEL) as OrdemListagem[]).map((k) => (
                <option key={k} value={k}>
                  {ORDEM_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button asChild size="sm" variant="outline">
            <a href="/parlamentares">Limpar</a>
          </Button>
          <Button size="sm" type="submit">
            Filtrar
          </Button>
        </div>
      </form>
    </div>
  )
}
