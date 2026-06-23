import type { RepresentanteCard } from '@/lib/queries/representantes'
import { ParlamentarCard } from './parlamentar-card'

// Grade de cards de parlamentar (server). Domínio de listagem — fica junto do
// ParlamentarCard, não em design-system/compositions (que é genérico). Os
// atributos `data-nome`/`data-partido` em cada <li> são o gancho do filtro
// client-side (progressive enhancement): o filtro esconde <li>s sem casar,
// e sem JS a lista server-rendered permanece completa.

interface Props {
  parlamentares: RepresentanteCard[]
  /** Texto quando a lista está vazia (ex.: "Nenhum senador ingerido…"). */
  emptyLabel: string
}

export function ParlamentarGrid({ parlamentares, emptyLabel }: Props) {
  if (parlamentares.length === 0) {
    return <p className="text-fg-tertiary text-sm">{emptyLabel}</p>
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {parlamentares.map((p) => (
        <li data-nome={p.nome} data-partido={p.partidoSigla} key={p.id}>
          <ParlamentarCard parlamentar={p} />
        </li>
      ))}
    </ul>
  )
}
