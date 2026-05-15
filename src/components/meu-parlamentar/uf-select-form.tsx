import { nomeUfCompleto, UFS, type Uf } from '@/lib/municipios'

// Form server-rendered — submete via GET, navegação para `?uf=X` faz o
// próximo step do fluxo aparecer. Sem JS.
export function UfSelectForm({ selecionada }: { selecionada?: Uf }) {
  return (
    <form
      action="/o-meu-parlamentar"
      method="get"
      className="space-y-4 rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-900"
    >
      <label className="flex flex-col gap-1.5">
        <span className="font-medium text-sm text-zinc-700 dark:text-zinc-300">
          Estado
        </span>
        <select
          name="uf"
          defaultValue={selecionada ?? ''}
          required
          className="min-h-[44px] rounded border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-600 dark:bg-zinc-800"
        >
          <option value="" disabled>
            Selecione…
          </option>
          {UFS.map((u) => (
            <option key={u} value={u}>
              {nomeUfCompleto(u)} ({u})
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="inline-flex min-h-[44px] items-center justify-center rounded bg-primary-700 px-4 py-2 font-medium text-sm text-white hover:bg-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:bg-primary-600 dark:hover:bg-primary-500"
      >
        Continuar
      </button>
    </form>
  )
}
