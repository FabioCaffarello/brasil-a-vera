// Sub-tab "Acompanhando" — Wave 10 Etapa 4.
//
// Lista todos os parlamentares acompanhados (ordenados por followed_at
// DESC). Sem botão de Acompanhar visível porque já estão sendo
// acompanhados — botão alterna para "Acompanhando ✓" via FollowButton
// (toggle remove).

import Link from 'next/link'

import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'
import { Button } from '@/design-system/primitives/button'

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
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <h3 className="font-medium text-foreground text-lg">
          Você ainda não acompanha ninguém
        </h3>
        <p className="mt-2 text-foreground-muted text-sm">
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
