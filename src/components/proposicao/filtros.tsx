import { Button } from '@/design-system/primitives/button'
import { Label } from '@/design-system/primitives/label'

// Server Component — `<form action="...">` submete via GET, RSC re-renderiza
// com os novos searchParams. Sem JS de client necessário para submit.
//
// Sprint 4.2 PR 2 commit 5/6 — refatorado para tokens semânticos +
// primitivas Label/Button do design system, espelhando parlamentar/filtros.

interface Props {
  anos: number[]
  selecionado: {
    tipo?: string
    ano?: string
    situacao?: string
  }
}

const TIPOS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'PL', label: 'PL — Projeto de Lei' },
  { value: 'PEC', label: 'PEC — Emenda à Constituição' },
  { value: 'PLP', label: 'PLP — Lei Complementar' },
  { value: 'MPV', label: 'MPV — Medida Provisória' },
  { value: 'PDC', label: 'PDC — Decreto Legislativo' },
  { value: 'PRC', label: 'PRC — Resolução' },
]

const SITUACOES = [
  { value: '', label: 'Todas as situações' },
  { value: 'TRAMITANDO', label: 'Tramitando' },
  { value: 'APROVADA', label: 'Aprovada' },
  { value: 'REJEITADA', label: 'Rejeitada' },
  { value: 'ARQUIVADA', label: 'Arquivada' },
  { value: 'TRANSFORMADA_EM_NORMA', label: 'Virou norma' },
]

const SELECT_CLASS =
  'min-h-[44px] rounded-md border border-border-strong bg-background px-2 py-1.5 text-foreground text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function FiltrosProposicao({ anos, selecionado }: Props) {
  return (
    <form
      action="/proposicoes"
      className="rounded-lg border border-border bg-surface p-4"
      method="get"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <Label
            className="text-foreground-muted text-xs"
            htmlFor="filtro-tipo"
          >
            Tipo
          </Label>
          <select
            className={SELECT_CLASS}
            defaultValue={selecionado.tipo ?? ''}
            id="filtro-tipo"
            name="tipo"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
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
            htmlFor="filtro-situacao"
          >
            Situação
          </Label>
          <select
            className={SELECT_CLASS}
            defaultValue={selecionado.situacao ?? ''}
            id="filtro-situacao"
            name="situacao"
          >
            {SITUACOES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <Button asChild size="sm" variant="outline">
          <a href="/proposicoes">Limpar</a>
        </Button>
        <Button size="sm" type="submit">
          Filtrar
        </Button>
      </div>
    </form>
  )
}
