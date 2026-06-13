// Cópia-rds de src/components/painel/parlamentares/lista-acompanhando.tsx —
// migração painel (área logada /rds/painel). Server Component.
//
// Original INTOCADO. Tradução de classnames EXCLUSIVAMENTE por
// docs/migration/token-map.md:
//   border-border         → border-line-default
//   bg-surface            → bg-surface-base
//   text-foreground       → text-fg-primary
//   text-foreground-muted → text-fg-tertiary
//
// `Button` → cópia local ./button; `ParlamentarCard` importado do ORIGINAL
// (client island). Href "Explorar" reescrito pra /rds/.

import Link from 'next/link'

import { ParlamentarCard } from '@/components/parlamentar/parlamentar-card'

import { Button } from './button'

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
          <Link href="/rds/parlamentares">Explorar parlamentares</Link>
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
