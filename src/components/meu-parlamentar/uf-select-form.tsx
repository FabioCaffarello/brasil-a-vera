import { Button } from '@/design-system/primitives/button'
import { nomeUfCompleto, UFS, type Uf } from '@/lib/municipios'

// Form server-rendered — submete via GET, navegação para `?uf=X` faz o
// próximo step do fluxo aparecer. Sem JS.
//
// Sprint 4.6 PR 3 — migrado para Button primitive + tokens semânticos.
// Native `<select>` preservado (Tier 2 do DS plan; submit GET sem JS;
// mesmo pattern dos filtros de listagem desde Sprint 4.2 PR 2).
const SELECT_CLASS =
  'min-h-[44px] rounded-md border border-border-strong bg-background px-3 py-2 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'

export function UfSelectForm({ selecionada }: { selecionada?: Uf }) {
  return (
    <form
      action="/o-meu-parlamentar"
      className="space-y-4 rounded-lg border border-border bg-surface p-5"
      method="get"
    >
      <label className="flex flex-col gap-1.5">
        <span className="font-medium text-foreground text-sm">Estado</span>
        <select
          className={SELECT_CLASS}
          defaultValue={selecionada ?? ''}
          name="uf"
          required
        >
          <option disabled value="">
            Selecione…
          </option>
          {UFS.map((u) => (
            <option key={u} value={u}>
              {nomeUfCompleto(u)} ({u})
            </option>
          ))}
        </select>
      </label>

      <Button type="submit">Continuar</Button>
    </form>
  )
}
