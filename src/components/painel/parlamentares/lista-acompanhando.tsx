// Lista de parlamentares acompanhados (painel/área logada). Server Component.
// Promovido ao RDS (ADR-033) — classnames em tokens RDS (token-map.md):
// border-line-default, bg-surface-base, text-fg-primary, text-fg-tertiary.
// `Button` (canônico) e `ParlamentarCard` (client island) importados.

import { Button } from '@fabio.caffarello/react-design-system/server'
import Link from 'next/link'
import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'

interface Parlamentar {
  id: string
  nome: string
  casa: string
  partidoSigla: string
  uf: string
  urlFoto: string | null
  pctAlinhamento: string | null
  votacoesAnalisadas: number | null
}

interface Props {
  acompanhados: Parlamentar[]
  isAnonymous: false
}

export function ListaAcompanhando({ acompanhados }: Props) {
  if (acompanhados.length === 0) {
    return (
      <div className="rounded-lg border border-line-default bg-surface-base p-8 text-center">
        <h3 className="font-medium text-fg-primary text-lg">
          Você ainda não acompanha ninguém
        </h3>
        <p className="mt-2 text-fg-tertiary text-sm">
          Explore parlamentares e clique em "Acompanhar" para começar a receber
          atualizações deles aqui.
        </p>
        <Button asChild className="mt-4" size="sm">
          <Link href="/parlamentares">Explorar parlamentares</Link>
        </Button>
      </div>
    )
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {acompanhados.map((p) => (
        <li key={p.id}>
          <ParlamentarCard follow={{ isFollowing: true }} parlamentar={p} />
        </li>
      ))}
    </ul>
  )
}
