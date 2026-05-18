import { X } from 'lucide-react'
import Link from 'next/link'

import { Combobox } from '@/design-system/compositions/combobox'
import {
  FilterChip,
  FilterChips,
} from '@/design-system/compositions/filter-chips'
import { Button } from '@/design-system/primitives/button'
import { Input } from '@/design-system/primitives/input'
import { Label } from '@/design-system/primitives/label'
import type { TemaDistinto } from '@/lib/queries/proposicoes'

interface Props {
  anos: number[]
  temas: TemaDistinto[]
  selecionado: {
    tipo?: string
    ano?: string
    situacao?: string
    /** Wave 8 Sprint 8.1 PR3 — código de tema (proposicao_tema.codigo_tema). */
    tema?: string
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

const SITUACAO_LABEL: Record<string, string> = Object.fromEntries(
  SITUACOES_CHIPS.map((s) => [s.value, s.label]),
)

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
 *
 * Wave 8 Sprint 8.1 PR2 — preserva também q + ordem.
 * Wave 8 Sprint 8.1 PR3 — preserva também tema + reutilizado pelos
 * chips de filtro ativo.
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
  for (const key of [
    'tipo',
    'ano',
    'situacao',
    'tema',
    'q',
    'ordem',
  ] as const) {
    const value = merged[key]
    if (value !== null && value !== undefined && value !== '') {
      params.set(key, value)
    }
  }
  const query = params.toString()
  return query ? `/proposicoes?${query}` : '/proposicoes'
}

/**
 * Chips de filtros aplicados (Wave 8 Sprint 8.1 PR3, espelhando padrão
 * da listagem /parlamentares). Cada chip mostra "Filtro: valor" e um
 * link × que remove apenas aquele filtro, preservando os demais via
 * buildHref. Ordem fica fora — é estado de visualização, não recorte.
 */
function FiltrosAtivos({
  selecionado,
  temas,
}: {
  selecionado: Props['selecionado']
  temas: TemaDistinto[]
}) {
  const ativos: Array<{
    key: keyof Props['selecionado']
    label: string
    value: string
  }> = []

  if (selecionado.tipo) {
    ativos.push({ key: 'tipo', label: 'Tipo', value: selecionado.tipo })
  }
  if (selecionado.situacao) {
    ativos.push({
      key: 'situacao',
      label: 'Situação',
      value: SITUACAO_LABEL[selecionado.situacao] ?? selecionado.situacao,
    })
  }
  if (selecionado.ano) {
    ativos.push({ key: 'ano', label: 'Ano', value: selecionado.ano })
  }
  if (selecionado.tema) {
    const codigo = Number(selecionado.tema)
    const tema = temas.find((t) => t.codigo === codigo)
    ativos.push({
      key: 'tema',
      label: 'Tema',
      value: tema?.nome ?? selecionado.tema,
    })
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
 * Filtros de proposições — Sprint 6.2 PR 2 (Wave 6) +
 * Wave 8 Sprint 8.1 PR2 (busca + ordenação) +
 * Wave 8 Sprint 8.1 PR3 (Combobox tema + chips ativos).
 *
 * Hybrid pragmático:
 * - **Tipo** (6 opções + "Todos"): FilterChips com Links (sem form).
 * - **Situação** (5 opções + "Todas"): FilterChips com Links.
 * - **Busca** (`q`): input SSR, Enter submete.
 * - **Tema** (~50-200 catalogados): Combobox com busca embutida.
 *   Cardinalidade alta justifica a primitiva command sobre select.
 * - **Ano**: `<select>` no form (cardinalidade média).
 * - **Ordem**: `<select>` no form (4 opções fixas, sem busca).
 * - **Chips de filtros ativos**: abaixo dos filtros, um chip por
 *   filtro aplicado com × para remover individual.
 */
export function FiltrosProposicao({ anos, temas, selecionado }: Props) {
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
        className="space-y-3 border-border border-t pt-4"
        method="get"
      >
        {selecionado.tipo ? (
          <input name="tipo" type="hidden" value={selecionado.tipo} />
        ) : null}
        {selecionado.situacao ? (
          <input name="situacao" type="hidden" value={selecionado.situacao} />
        ) : null}

        <div className="flex flex-col gap-1">
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <Label
              className="text-foreground-muted text-xs"
              htmlFor="filtro-tema"
            >
              Tema
            </Label>
            <Combobox
              allOptionLabel="Todos"
              ariaLabel="Filtrar por tema"
              defaultValue={selecionado.tema ?? ''}
              emptyText="Nenhum tema casa com a busca"
              name="tema"
              options={temas.map((t) => ({
                value: String(t.codigo),
                label: t.nome,
              }))}
              placeholder="Todos"
              searchPlaceholder="Buscar tema"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label
              className="text-foreground-muted text-xs"
              htmlFor="filtro-ano"
            >
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
        </div>

        <div className="flex justify-end gap-2">
          <Button asChild size="sm" variant="outline">
            <a href="/proposicoes">Limpar</a>
          </Button>
          <Button size="sm" type="submit">
            Filtrar
          </Button>
        </div>
      </form>

      <FiltrosAtivos selecionado={selecionado} temas={temas} />
    </div>
  )
}
