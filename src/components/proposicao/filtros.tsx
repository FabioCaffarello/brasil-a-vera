// Filtros de proposições — promovido ao RDS (migração ADR-033). Tokens pela
// tabela canônica (docs/migration/token-map.md).
//
// - FilterChips (wrapper) + Label do RDS /server (server-safe; §3.9).
// - Chip (item) de @/design-system/compositions (zero-JS; chips <Link>,
//   ADR-022). Autocomplete (tema): client island do RDS via wrapper de
//   bundle (rds-autocomplete), name/form (#225). Button de
//   @/design-system/primitives. Busca: <input> cru com tokens RDS.

import {
  Button,
  Chip,
  FilterChips,
  Label,
} from '@fabio.caffarello/react-design-system/server'
import { X } from 'lucide-react'
import Link from 'next/link'
import { FilterPanel } from '@/components/ui/filter-panel'
import { Autocomplete } from '@/design-system/primitives/rds-autocomplete'
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

const INPUT_CLASS =
  'min-h-[44px] rounded-md border border-line-emphasis bg-surface-canvas px-2 py-1.5 text-fg-primary text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2'

/**
 * Helper interno: constrói href preservando outros filtros. Override
 * com `null` remove o filtro do URL. Base /rds/.
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
 * Chips de filtros aplicados (Wave 8 Sprint 8.1 PR3). Cada chip mostra
 * "Filtro: valor" e um link × que remove apenas aquele filtro,
 * preservando os demais via buildHref. Ordem fica fora — é estado de
 * visualização, não recorte.
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
 * Filtros de proposições (cópia-rds). Mesmo contrato do original (hybrid
 * pragmático):
 * - **Tipo** (6 opções + "Todos"): FilterChips com Links (sem form).
 * - **Situação** (5 opções + "Todas"): FilterChips com Links.
 * - **Busca** (`q`): input SSR, Enter submete.
 * - **Tema** (~50-200 catalogados): Combobox com busca embutida.
 * - **Ano**: `<select>` no form (cardinalidade média).
 * - **Ordem**: `<select>` no form (4 opções fixas, sem busca).
 * - **Chips de filtros ativos**: abaixo dos filtros, um chip por
 *   filtro aplicado com × para remover individual.
 */
export function FiltrosProposicao({ anos, temas, selecionado }: Props) {
  return (
    <FilterPanel>
      <FilterChips label="Tipo">
        <Chip asChild selected={!selecionado.tipo}>
          <Link href={buildHref(selecionado, { tipo: null })}>Todos</Link>
        </Chip>
        {TIPOS_CHIPS.map((t) => (
          <Chip asChild key={t.value} selected={selecionado.tipo === t.value}>
            <Link href={buildHref(selecionado, { tipo: t.value })}>
              {t.label}
            </Link>
          </Chip>
        ))}
      </FilterChips>

      <FilterChips label="Situação">
        <Chip asChild selected={!selecionado.situacao}>
          <Link href={buildHref(selecionado, { situacao: null })}>Todas</Link>
        </Chip>
        {SITUACOES_CHIPS.map((s) => (
          <Chip
            asChild
            key={s.value}
            selected={selecionado.situacao === s.value}
          >
            <Link href={buildHref(selecionado, { situacao: s.value })}>
              {s.label}
            </Link>
          </Chip>
        ))}
      </FilterChips>

      <form
        action="/proposicoes"
        className="space-y-3 border-line-default border-t pt-4"
        method="get"
      >
        {selecionado.tipo ? (
          <input name="tipo" type="hidden" value={selecionado.tipo} />
        ) : null}
        {selecionado.situacao ? (
          <input name="situacao" type="hidden" value={selecionado.situacao} />
        ) : null}

        <div className="flex flex-col gap-1">
          <Label className="text-fg-tertiary text-xs" htmlFor="filtro-q">
            Buscar (número ou palavra na ementa)
          </Label>
          <input
            className={INPUT_CLASS}
            defaultValue={selecionado.q ?? ''}
            id="filtro-q"
            name="q"
            placeholder="Ex: 1234 ou educação"
            type="search"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1">
            <Label className="text-fg-tertiary text-xs" htmlFor="filtro-tema">
              Tema
            </Label>
            <Autocomplete
              aria-label="Filtrar por tema"
              defaultValue={selecionado.tema ?? ''}
              emptyMessage="Nenhum tema casa com a busca"
              name="tema"
              options={[
                { value: '', label: 'Todos' },
                ...temas.map((t) => ({
                  value: String(t.codigo),
                  label: t.nome,
                })),
              ]}
              placeholder="Todos"
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-fg-tertiary text-xs" htmlFor="filtro-ano">
              Ano
            </Label>
            <select
              className={INPUT_CLASS}
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
            <Label className="text-fg-tertiary text-xs" htmlFor="filtro-ordem">
              Ordem
            </Label>
            <select
              className={INPUT_CLASS}
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
    </FilterPanel>
  )
}
