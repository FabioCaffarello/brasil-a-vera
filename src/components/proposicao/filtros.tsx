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

export function FiltrosProposicao({ anos, selecionado }: Props) {
  return (
    <form
      action="/proposicoes"
      method="get"
      className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Tipo
          </span>
          <select
            name="tipo"
            defaultValue={selecionado.tipo ?? ''}
            className="min-h-[44px] rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          >
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Ano
          </span>
          <select
            name="ano"
            defaultValue={selecionado.ano ?? ''}
            className="min-h-[44px] rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          >
            <option value="">Todos</option>
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Situação
          </span>
          <select
            name="situacao"
            defaultValue={selecionado.situacao ?? ''}
            className="min-h-[44px] rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          >
            {SITUACOES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex justify-end gap-2">
        <a
          href="/proposicoes"
          className="inline-flex min-h-[44px] items-center rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Limpar
        </a>
        <button
          type="submit"
          className="min-h-[44px] rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Filtrar
        </button>
      </div>
    </form>
  )
}
