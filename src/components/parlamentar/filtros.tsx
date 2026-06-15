// Filtros de parlamentares — promovido ao RDS (migração ADR-033). Tokens
// pela tabela canônica (docs/migration/token-map.md).
//
// Componentes:
// - FilterChips (wrapper) + Label vêm do RDS /server (server-safe; §3.9).
// - FilterChip (item) de @/design-system/compositions (zero-JS; chips são
//   <Link>, ADR-022 — o Chip do RDS é client).
// - Combobox: client island de @/design-system/compositions (cmdk+popover).
// - Button de @/design-system/primitives.

import {
  FilterChips,
  Label,
} from '@fabio.caffarello/react-design-system/server'
import { X } from 'lucide-react'
import Link from 'next/link'

import { Combobox } from '@/design-system/compositions/combobox'
import { FilterChip } from '@/design-system/compositions/filter-chips'
import { Button } from '@/design-system/primitives/button'
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
  'min-h-[44px] rounded-md border border-line-emphasis bg-surface-canvas px-2 py-1.5 text-fg-primary text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2'

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
 * Chips de filtros aplicados. Cada chip mostra "Filtro: valor" e um link
 * × que remove apenas aquele filtro, preservando os demais via buildHref.
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
    <div className="flex flex-wrap items-center gap-2 border-line-default border-t pt-3">
      <span className="text-fg-tertiary text-xs uppercase tracking-wider">
        Filtros ativos:
      </span>
      {ativos.map((a) => (
        <Link
          aria-label={`Remover filtro ${a.label}: ${a.value}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-line-emphasis bg-surface-canvas px-3 py-1 text-fg-primary text-xs hover:bg-surface-base"
          href={buildHref(selecionado, { [a.key]: null })}
          key={a.key}
        >
          <span>
            <span className="text-fg-tertiary">{a.label}:</span>{' '}
            <span className="font-medium">{a.value}</span>
          </span>
          <X aria-hidden className="h-3 w-3 text-fg-tertiary" />
        </Link>
      ))}
    </div>
  )
}

/**
 * Filtros de parlamentares. Casa via FilterChips (Links, URL=state); busca
 * por nome (input search, SSR puro); partido + UF via Combobox (client
 * island); ordem via select nativo; chips de filtros ativos abaixo.
 */
export function Filtros({ partidos, ufs, selecionado }: Props) {
  return (
    <div className="space-y-4 rounded-lg border border-line-default bg-surface-base p-4">
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
        className="space-y-3 border-line-default border-t pt-4"
        method="get"
      >
        {selecionado.casa ? (
          <input name="casa" type="hidden" value={selecionado.casa} />
        ) : null}

        {/* Busca por nome — SSR puro, Enter submete. */}
        <div className="flex flex-col gap-1">
          <Label className="text-fg-tertiary text-xs" htmlFor="filtro-q">
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
              className="text-fg-tertiary text-xs"
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
            <Label className="text-fg-tertiary text-xs" htmlFor="filtro-uf">
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
            <Label className="text-fg-tertiary text-xs" htmlFor="filtro-ordem">
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
