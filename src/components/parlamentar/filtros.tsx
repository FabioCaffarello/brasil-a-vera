import { X } from 'lucide-react'
import Link from 'next/link'

import { Combobox } from '@/design-system/compositions/combobox'
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

const CASA_LABEL: Record<string, string> = {
  CAMARA: 'Câmara',
  SENADO: 'Senado',
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
 * Wave 7 Sprint 7.1 PR3: reutilizado pelos chips de filtro ativo.
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
 * Chips de filtros aplicados (Sprint 7.1 PR3). Cada chip mostra
 * "Filtro: valor" e um link × que remove apenas aquele filtro,
 * preservando os demais via buildHref. Casa, partido, UF e q ganham
 * chip; ordem fica fora — é estado de visualização, não recorte.
 */
function FiltrosAtivos({ selecionado }: { selecionado: Props['selecionado'] }) {
  const ativos: Array<{
    key: keyof Props['selecionado']
    label: string
    value: string
  }> = []
  if (selecionado.casa) {
    ativos.push({
      key: 'casa',
      label: 'Casa',
      value: CASA_LABEL[selecionado.casa] ?? selecionado.casa,
    })
  }
  if (selecionado.partido) {
    ativos.push({
      key: 'partido',
      label: 'Partido',
      value: selecionado.partido,
    })
  }
  if (selecionado.uf) {
    ativos.push({ key: 'uf', label: 'UF', value: selecionado.uf })
  }
  if (selecionado.q) {
    ativos.push({
      key: 'q',
      label: 'Busca',
      value: `"${selecionado.q}"`,
    })
  }

  if (ativos.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 border-border border-t pt-3">
      <span className="text-foreground-muted text-xs uppercase tracking-wider">
        Filtros ativos:
      </span>
      {ativos.map((a) => (
        <Link
          aria-label={`Remover filtro ${a.label}: ${a.value}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-background px-3 py-1 text-foreground text-xs hover:bg-surface"
          href={buildHref(selecionado, { [a.key]: null })}
          key={a.key}
        >
          <span>
            <span className="text-foreground-muted">{a.label}:</span>{' '}
            <span className="font-medium">{a.value}</span>
          </span>
          <X aria-hidden className="h-3 w-3 text-foreground-muted" />
        </Link>
      ))}
    </div>
  )
}

/**
 * Filtros de parlamentares — Sprint 6.2 PR 1 (Wave 6) +
 * Sprint 7.1 PR2/PR3 (Wave 7).
 *
 * - **Casa** (3 opções): FilterChips com Links preservando outros filtros.
 *   URL=state, sem JS client.
 * - **Busca por nome** (Sprint 7.1 PR2): `<input type="search" name="q">`
 *   SSR puro, Enter submete.
 * - **Partido** (~35 opções) + **UF** (27 estados) (Sprint 7.1 PR3):
 *   `<Combobox>` (cmdk + popover) com busca embutida, no lugar do
 *   `<select>` nativo. Combobox renderiza `<input type="hidden">`
 *   acompanhando o valor — form GET submete normalmente.
 * - **Ordem** (4 opções fixas): `<select>` nativo (Combobox seria
 *   overkill para 4 opções sem busca).
 * - **Chips de filtros ativos** (Sprint 7.1 PR3): abaixo dos filtros,
 *   um chip por filtro aplicado com × para remover. Reusa `buildHref`.
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
            <Combobox
              allOptionLabel="Todos"
              ariaLabel="Filtrar por partido"
              defaultValue={selecionado.partido ?? ''}
              name="partido"
              options={partidos.map((p) => ({ value: p, label: p }))}
              placeholder="Todos"
              searchPlaceholder="Buscar partido"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label
              className="text-foreground-muted text-xs"
              htmlFor="filtro-uf"
            >
              UF
            </Label>
            <Combobox
              allOptionLabel="Todas"
              ariaLabel="Filtrar por UF"
              defaultValue={selecionado.uf ?? ''}
              name="uf"
              options={ufs.map((u) => ({ value: u, label: u }))}
              placeholder="Todas"
              searchPlaceholder="Buscar UF"
            />
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

      <FiltrosAtivos selecionado={selecionado} />
    </div>
  )
}
