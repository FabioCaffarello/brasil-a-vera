import { Badge } from '@fabio.caffarello/react-design-system/server'
import type { ReactNode } from 'react'

import { SectionCard } from '@/design-system/compositions/section-card'
import type { RepresentanteCard } from '@/lib/queries/representantes'
import { ParlamentarGrid } from './parlamentar-grid'

// Seção de uma casa (Senadores / Deputados) na rota "Quem me representa":
// SectionCard (header + contagem no slot badge) envolvendo a grade de cards.
// Colapsa os dois blocos <section><h2>…<span>(N)</span> duplicados da página
// em chamadas declarativas. `id` serve a anchor navigation.

interface Props {
  id: string
  title: string
  icon?: ReactNode
  parlamentares: RepresentanteCard[]
  emptyLabel: string
}

export function RepresentantesSection({
  id,
  title,
  icon,
  parlamentares,
  emptyLabel,
}: Props) {
  return (
    <SectionCard
      badge={
        <Badge
          aria-label={`${parlamentares.length} ${title}`}
          size="sm"
          variant="neutral"
        >
          {parlamentares.length}
        </Badge>
      }
      icon={icon}
      id={id}
      title={title}
    >
      <ParlamentarGrid emptyLabel={emptyLabel} parlamentares={parlamentares} />
    </SectionCard>
  )
}
