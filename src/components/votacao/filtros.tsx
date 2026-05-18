import { X } from 'lucide-react'
import Link from 'next/link'

import {
  FilterChip,
  FilterChips,
} from '@/design-system/compositions/filter-chips'
import { Button } from '@/design-system/primitives/button'
import { Label } from '@/design-system/primitives/label'

interface Props {
  anos: number[]
  selecionado: {
    casa?: string
    ano?: string
    resultado?: string
    somenteNominais?: boolean
  }
}

const SELECT_CLASS =
  'min-h-[44px] rounded-md border border-border-strong bg-background px-2 py-1.5 text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

/**
 * Helper interno: constrói href preservando outros filtros. Override
 * com `null` remove o filtro do URL.
 *
 * `somenteNominais` é boolean — passar `'1'` ativa, `null` desativa.
 */
function buildHref(
  current: Props['selecionado'],
  overrides: Partial<{
    casa: string | null
    ano: string | null
    resultado: string | null
    somenteNominais: string | null
  }>,
): string {
  const params = new URLSearchParams()
  const casa = overrides.casa !== undefined ? overrides.casa : current.casa
  if (casa) params.set('casa', casa)

  const ano = overrides.ano !== undefined ? overrides.ano : current.ano
  if (ano) params.set('ano', ano)

  const resultado =
    overrides.resultado !== undefined ? overrides.resultado : current.resultado
  if (resultado) params.set('resultado', resultado)

  const nominais =
    overrides.somenteNominais !== undefined
      ? overrides.somenteNominais
      : current.somenteNominais
        ? '1'
        : null
  if (nominais) params.set('somenteNominais', nominais)

  const query = params.toString()
  return query ? `/votacoes?${query}` : '/votacoes'
}

const CASA_LABEL: Record<string, string> = {
  CAMARA: 'Câmara',
  SENADO: 'Senado',
}

const RESULTADO_LABEL: Record<string, string> = {
  aprovadas: 'Só aprovadas',
  rejeitadas: 'Só rejeitadas',
}

/**
 * Chips de filtros aplicados (Wave 9 Sprint 9.1 PR4, paridade com
 * Wave 8 Sprint 8.1 PR3 / proposicao/filtros.tsx). Cada chip mostra
 * "Filtro: valor" e um link × que remove apenas aquele filtro,
 * preservando os demais via buildHref.
 */
function FiltrosAtivos({ selecionado }: { selecionado: Props['selecionado'] }) {
  const ativos: Array<{
    key: 'casa' | 'resultado' | 'ano' | 'somenteNominais'
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
  if (selecionado.resultado) {
    ativos.push({
      key: 'resultado',
      label: 'Resultado',
      value: RESULTADO_LABEL[selecionado.resultado] ?? selecionado.resultado,
    })
  }
  if (selecionado.ano) {
    ativos.push({ key: 'ano', label: 'Ano', value: selecionado.ano })
  }
  if (selecionado.somenteNominais) {
    ativos.push({ key: 'somenteNominais', label: 'Tipo', value: 'Só nominais' })
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
 * Filtros de votações — Sprint 6.2 PR 3 (Wave 6) +
 * Wave 9 Sprint 9.1 PR4 (FiltrosAtivos para paridade com Wave 8).
 *
 * Hybrid pragmático (D1):
 * - **Casa** (3 opções): FilterChips com Link asChild
 * - **Resultado** (3 opções): FilterChips com Link asChild
 * - **Só nominais** (toggle bool): FilterChip único acting as toggle —
 *   click adiciona/remove `somenteNominais=1` do URL
 * - **Ano** (~10+ valores): mantém `<select>` em form GET
 * - **Chips de filtros ativos**: abaixo dos filtros, um chip por
 *   filtro aplicado com × para remover individual.
 *
 * Form preserva chips ao submeter Ano via hidden inputs.
 */
export function FiltrosVotacao({ anos, selecionado }: Props) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
      <FilterChips label="Casa">
        <FilterChip asChild selected={!selecionado.casa}>
          <Link href={buildHref(selecionado, { casa: null })}>
            Câmara + Senado
          </Link>
        </FilterChip>
        <FilterChip asChild selected={selecionado.casa === 'CAMARA'}>
          <Link href={buildHref(selecionado, { casa: 'CAMARA' })}>Câmara</Link>
        </FilterChip>
        <FilterChip asChild selected={selecionado.casa === 'SENADO'}>
          <Link href={buildHref(selecionado, { casa: 'SENADO' })}>Senado</Link>
        </FilterChip>
      </FilterChips>

      <FilterChips label="Resultado">
        <FilterChip asChild selected={!selecionado.resultado}>
          <Link href={buildHref(selecionado, { resultado: null })}>Todas</Link>
        </FilterChip>
        <FilterChip asChild selected={selecionado.resultado === 'aprovadas'}>
          <Link href={buildHref(selecionado, { resultado: 'aprovadas' })}>
            Só aprovadas
          </Link>
        </FilterChip>
        <FilterChip asChild selected={selecionado.resultado === 'rejeitadas'}>
          <Link href={buildHref(selecionado, { resultado: 'rejeitadas' })}>
            Só rejeitadas
          </Link>
        </FilterChip>
      </FilterChips>

      <FilterChips label="Tipo de registro">
        <FilterChip asChild selected={Boolean(selecionado.somenteNominais)}>
          <Link
            href={buildHref(selecionado, {
              somenteNominais: selecionado.somenteNominais ? null : '1',
            })}
          >
            Só nominais (com voto individual)
          </Link>
        </FilterChip>
      </FilterChips>

      <form
        action="/votacoes"
        className="flex flex-wrap items-end gap-3 border-border border-t pt-4"
        method="get"
      >
        {selecionado.casa ? (
          <input name="casa" type="hidden" value={selecionado.casa} />
        ) : null}
        {selecionado.resultado ? (
          <input name="resultado" type="hidden" value={selecionado.resultado} />
        ) : null}
        {selecionado.somenteNominais ? (
          <input name="somenteNominais" type="hidden" value="1" />
        ) : null}

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

        <div className="ml-auto flex gap-2">
          <Button asChild size="sm" variant="outline">
            <a href="/votacoes">Limpar</a>
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
