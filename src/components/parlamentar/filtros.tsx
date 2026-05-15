import { Button } from '@/design-system/primitives/button'
import { Label } from '@/design-system/primitives/label'

// Server Component — `<form action="...">` submete via GET, RSC re-renderiza
// com os novos searchParams. Sem JS de client necessário para submit.
//
// Sprint 4.2 PR 2 commit 4/6 — refatorado para tokens semânticos +
// primitivas Label/Button do design system. <select> nativo preservado
// (Select é Tier 2; sem demanda concreta para custom virtualization).

interface Props {
  partidos: string[]
  ufs: string[]
  selecionado: {
    casa?: string
    partido?: string
    uf?: string
  }
}

const CASAS = [
  { value: '', label: 'Todas as casas' },
  { value: 'CAMARA', label: 'Câmara dos Deputados' },
  { value: 'SENADO', label: 'Senado Federal' },
]

const SELECT_CLASS =
  'min-h-[44px] rounded-md border border-border-strong bg-background px-2 py-1.5 text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function Filtros({ partidos, ufs, selecionado }: Props) {
  return (
    <form
      action="/parlamentares"
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
          <Label
            className="text-foreground-muted text-xs"
            htmlFor="filtro-partido"
          >
            Partido
          </Label>
          <select
            className={SELECT_CLASS}
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
          <Label className="text-foreground-muted text-xs" htmlFor="filtro-uf">
            UF
          </Label>
          <select
            className={SELECT_CLASS}
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
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <Button asChild size="sm" variant="outline">
          <a href="/parlamentares">Limpar</a>
        </Button>
        <Button size="sm" type="submit">
          Filtrar
        </Button>
      </div>
    </form>
  )
}
