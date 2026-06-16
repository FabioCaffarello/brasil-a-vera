// Filtros de votações — promovido ao RDS (migração ADR-033). Tokens pela
// tabela canônica (docs/migration/token-map.md).
//
// - FilterChips (wrapper) + Label do RDS /server (server-safe; §3.9).
// - Chip (item) de @/design-system/compositions (zero-JS; chips <Link>,
//   ADR-022). Button de @/design-system/primitives. Sem Combobox (Ano é
//   `<select>`); sem busca livre (a listagem de votações não indexa texto).

import {
  Chip,
  FilterChips,
  Label,
} from '@fabio.caffarello/react-design-system/server'
import { X } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/design-system/primitives/button'

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
  'min-h-[44px] rounded-md border border-line-emphasis bg-surface-canvas px-2 py-1.5 text-fg-primary text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2'

/**
 * Helper interno: constrói href preservando outros filtros. Override
 * com `null` remove o filtro do URL. Base /rds/.
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
 * Chips de filtros aplicados (paridade com proposicao/filtros.tsx). Cada
 * chip mostra "Filtro: valor" e um link × que remove apenas aquele
 * filtro, preservando os demais via buildHref.
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
 * Filtros de votações (cópia-rds). Mesmo contrato do original (hybrid
 * pragmático):
 * - **Casa** (3 opções): FilterChips com Links.
 * - **Resultado** (3 opções): FilterChips com Links.
 * - **Só nominais** (toggle bool): Chip único acting as toggle —
 *   click adiciona/remove `somenteNominais=1` do URL.
 * - **Ano** (~10+ valores): mantém `<select>` em form GET.
 * - **Chips de filtros ativos**: abaixo dos filtros, um chip por
 *   filtro aplicado com × para remover individual.
 *
 * Form preserva chips ao submeter Ano via hidden inputs.
 */
export function FiltrosVotacao({ anos, selecionado }: Props) {
  return (
    <div className="space-y-4 rounded-lg border border-line-default bg-surface-base p-4">
      <FilterChips label="Casa">
        <Chip asChild selected={!selecionado.casa}>
          <Link href={buildHref(selecionado, { casa: null })}>
            Câmara + Senado
          </Link>
        </Chip>
        <Chip asChild selected={selecionado.casa === 'CAMARA'}>
          <Link href={buildHref(selecionado, { casa: 'CAMARA' })}>Câmara</Link>
        </Chip>
        <Chip asChild selected={selecionado.casa === 'SENADO'}>
          <Link href={buildHref(selecionado, { casa: 'SENADO' })}>Senado</Link>
        </Chip>
      </FilterChips>

      <FilterChips label="Resultado">
        <Chip asChild selected={!selecionado.resultado}>
          <Link href={buildHref(selecionado, { resultado: null })}>Todas</Link>
        </Chip>
        <Chip asChild selected={selecionado.resultado === 'aprovadas'}>
          <Link href={buildHref(selecionado, { resultado: 'aprovadas' })}>
            Só aprovadas
          </Link>
        </Chip>
        <Chip asChild selected={selecionado.resultado === 'rejeitadas'}>
          <Link href={buildHref(selecionado, { resultado: 'rejeitadas' })}>
            Só rejeitadas
          </Link>
        </Chip>
      </FilterChips>

      <FilterChips label="Tipo de registro">
        <Chip asChild selected={Boolean(selecionado.somenteNominais)}>
          <Link
            href={buildHref(selecionado, {
              somenteNominais: selecionado.somenteNominais ? null : '1',
            })}
          >
            Só nominais (com voto individual)
          </Link>
        </Chip>
      </FilterChips>

      <form
        action="/votacoes"
        className="flex flex-wrap items-end gap-3 border-line-default border-t pt-4"
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
          <Label className="text-fg-tertiary text-xs" htmlFor="filtro-ano">
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
