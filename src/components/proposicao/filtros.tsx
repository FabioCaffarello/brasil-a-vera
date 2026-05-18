import Link from 'next/link'

import {
  FilterChip,
  FilterChips,
} from '@/design-system/compositions/filter-chips'
import { Button } from '@/design-system/primitives/button'
import { Input } from '@/design-system/primitives/input'
import { Label } from '@/design-system/primitives/label'

interface Props {
  anos: number[]
  selecionado: {
    tipo?: string
    ano?: string
    situacao?: string
    /** Wave 8 Sprint 8.1 PR2 — busca livre (numero ou ementa). */
    q?: string
    /** Wave 8 Sprint 8.1 PR2 — ordem de exibição. */
    ordem?: string
  }
}

const TIPOS_CHIPS = [
  { value: 'PL', label: 'PL' },
  { value: 'PEC', label: 'PEC' },
  { value: 'PLP', label: 'PLP' },
  { value: 'MPV', label: 'MPV' },
  { value: 'PDC', label: 'PDC' },
  { value: 'PRC', label: 'PRC' },
]

const SITUACOES_CHIPS = [
  { value: 'TRAMITANDO', label: 'Tramitando' },
  { value: 'APROVADA', label: 'Aprovada' },
  { value: 'REJEITADA', label: 'Rejeitada' },
  { value: 'ARQUIVADA', label: 'Arquivada' },
  { value: 'TRANSFORMADA_EM_NORMA', label: 'Virou norma' },
]

const ORDEM_OPCOES = [
  { value: 'recente', label: 'Mais recentes' },
  { value: 'antiga', label: 'Mais antigas' },
  { value: 'movimentada', label: 'Movimentadas recentemente' },
  { value: 'parada', label: 'Paradas há mais tempo' },
]

const SELECT_CLASS =
  'min-h-[44px] rounded-md border border-border-strong bg-background px-2 py-1.5 text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

/**
 * Helper interno: constrói href preservando outros filtros. Override
 * com `null` remove o filtro do URL.
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
  for (const key of ['tipo', 'ano', 'situacao', 'q', 'ordem'] as const) {
    const value = merged[key]
    if (value !== null && value !== undefined && value !== '') {
      params.set(key, value)
    }
  }
  const query = params.toString()
  return query ? `/proposicoes?${query}` : '/proposicoes'
}

/**
 * Filtros de proposições — Sprint 6.2 PR 2 (Wave 6, reskin listagens) +
 * Wave 8 Sprint 8.1 PR2 (busca por ementa/numero + ordenação SSR).
 *
 * Hybrid pragmático:
 * - **Busca** (`q`): input de texto SSR. Sem onChange, sem debounce —
 *   Enter submete (P1: densidade, P5: zero JS no path anônimo). Numero
 *   puro → match exato; texto → ILIKE %X% em ementa.
 * - **Ordem** (`ordem`): select 4-opção, troca scope via form GET.
 * - **Tipo** (6 opções + "Todos"): FilterChips com Links (sem form).
 * - **Situação** (5 opções + "Todas"): FilterChips com Links.
 * - **Ano**: `<select>` no form (alta cardinalidade ~10+ anos).
 *
 * Chips de Tipo/Situação preservam q/ordem via buildHref. Form de Ano
 * preserva tipo/situação/q/ordem via hidden inputs ao submeter.
 */
export function FiltrosProposicao({ anos, selecionado }: Props) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <FilterChips label="Tipo">
        <FilterChip asChild selected={!selecionado.tipo}>
          <Link href={buildHref(selecionado, { tipo: null })}>Todos</Link>
        </FilterChip>
        {TIPOS_CHIPS.map((t) => (
          <FilterChip
            asChild
            key={t.value}
            selected={selecionado.tipo === t.value}
          >
            <Link href={buildHref(selecionado, { tipo: t.value })}>
              {t.label}
            </Link>
          </FilterChip>
        ))}
      </FilterChips>

      <FilterChips label="Situação">
        <FilterChip asChild selected={!selecionado.situacao}>
          <Link href={buildHref(selecionado, { situacao: null })}>Todas</Link>
        </FilterChip>
        {SITUACOES_CHIPS.map((s) => (
          <FilterChip
            asChild
            key={s.value}
            selected={selecionado.situacao === s.value}
          >
            <Link href={buildHref(selecionado, { situacao: s.value })}>
              {s.label}
            </Link>
          </FilterChip>
        ))}
      </FilterChips>

      <form
        action="/proposicoes"
        className="flex flex-wrap items-end gap-3 border-border border-t pt-4"
        method="get"
      >
        {selecionado.tipo ? (
          <input name="tipo" type="hidden" value={selecionado.tipo} />
        ) : null}
        {selecionado.situacao ? (
          <input name="situacao" type="hidden" value={selecionado.situacao} />
        ) : null}

        <div className="flex min-w-[200px] flex-1 flex-col gap-1">
          <Label className="text-foreground-muted text-xs" htmlFor="filtro-q">
            Buscar (número ou palavra na ementa)
          </Label>
          <Input
            defaultValue={selecionado.q ?? ''}
            id="filtro-q"
            name="q"
            placeholder="Ex: 1234 ou educação"
            type="search"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-foreground-muted text-xs" htmlFor="filtro-ano">
            Ano
          </Label>
          <select
            className={SELECT_CLASS}
            defaultValue={selecionado.ano ?? ''}
            id="filtro-ano"
            name="ano"
          >
            <option value="">Todos</option>
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <Label
            className="text-foreground-muted text-xs"
            htmlFor="filtro-ordem"
          >
            Ordem
          </Label>
          <select
            className={SELECT_CLASS}
            defaultValue={selecionado.ordem ?? 'recente'}
            id="filtro-ordem"
            name="ordem"
          >
            {ORDEM_OPCOES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex gap-2">
          <Button asChild size="sm" variant="outline">
            <a href="/proposicoes">Limpar</a>
          </Button>
          <Button size="sm" type="submit">
            Filtrar
          </Button>
        </div>
      </form>
    </div>
  )
}
