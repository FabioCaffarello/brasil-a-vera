import { Button } from '@/design-system/primitives/button'
import { Label } from '@/design-system/primitives/label'

// Server Component — `<form action="...">` submete via GET, RSC re-renderiza
// com os novos searchParams. Sem JS de client necessário para submit.
//
// Sprint 4.2 PR 2 commit 6/6 — refatorado para tokens semânticos +
// primitivas Label/Button do design system, espelhando parlamentar/filtros
// e proposicao/filtros. Mantém checkbox nativo (Checkbox é Tier 2; sem
// primitiva curada ainda — mesmo critério de Select).

interface Props {
  anos: number[]
  selecionado: {
    casa?: string
    ano?: string
    resultado?: string
    somenteNominais?: boolean
  }
}

const CASAS = [
  { value: '', label: 'Câmara + Senado' },
  { value: 'CAMARA', label: 'Câmara dos Deputados' },
  { value: 'SENADO', label: 'Senado Federal' },
]

const RESULTADOS = [
  { value: '', label: 'Aprovadas + rejeitadas' },
  { value: 'aprovadas', label: 'Só aprovadas' },
  { value: 'rejeitadas', label: 'Só rejeitadas' },
]

const SELECT_CLASS =
  'min-h-[44px] rounded-md border border-border-strong bg-background px-2 py-1.5 text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function FiltrosVotacao({ anos, selecionado }: Props) {
  return (
    <form
      action="/votacoes"
      className="rounded-lg border border-border bg-surface p-4"
      method="get"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label
            className="text-foreground-muted text-xs"
            htmlFor="filtro-casa"
          >
            Casa
          </Label>
          <select
            className={SELECT_CLASS}
            defaultValue={selecionado.casa ?? ''}
            id="filtro-casa"
            name="casa"
          >
            {CASAS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
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
            htmlFor="filtro-resultado"
          >
            Resultado
          </Label>
          <select
            className={SELECT_CLASS}
            defaultValue={selecionado.resultado ?? ''}
            id="filtro-resultado"
            name="resultado"
          >
            {RESULTADOS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Label
        className="mt-3 flex items-center gap-2 text-foreground text-sm"
        htmlFor="filtro-somente-nominais"
      >
        <input
          className="size-5 rounded border-border-strong accent-brand"
          defaultChecked={Boolean(selecionado.somenteNominais)}
          id="filtro-somente-nominais"
          name="somenteNominais"
          type="checkbox"
          value="1"
        />
        Só votações nominais (com voto individual registrado)
      </Label>

      <div className="mt-3 flex justify-end gap-2">
        <Button asChild size="sm" variant="outline">
          <a href="/votacoes">Limpar</a>
        </Button>
        <Button size="sm" type="submit">
          Filtrar
        </Button>
      </div>
    </form>
  )
}
