// src/components/partido/bancada-list.tsx — consome o RDS (tokens
// traduzidos via docs/migration/token-map.md; promovido do staging /rds/).
// Server Component puro, zero-JS: foto via `ParlamentarAvatarBase` (AvatarBase
// server-safe do RDS, #250/v4.8) + next/link.

import { Card, Text } from '@fabio.caffarello/react-design-system/server'
import Link from 'next/link'

import { ParlamentarAvatarBase } from '@/components/parlamentar/parlamentar-avatar-base'
import type { PartidoMembro } from '@/lib/queries/partidos'

interface Props {
  membros: PartidoMembro[]
}

export function BancadaList({ membros }: Props) {
  if (membros.length === 0) {
    return (
      <Text variant="bodySmall" className="text-fg-tertiary">
        Sem parlamentares registrados nesta sigla.
      </Text>
    )
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {membros.map((m) => (
        <li key={m.id}>
          <Card
            padding="none"
            variant="default"
            className="transition-colors hover:border-line-emphasis"
          >
            <Link
              className="flex items-center gap-3 rounded-lg p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
              href={`/parlamentares/${m.id}`}
            >
              <ParlamentarAvatarBase
                className="shrink-0"
                loading="lazy"
                nome={m.nome}
                size="md"
                urlFoto={m.urlFoto}
              />
              <div className="min-w-0">
                <Text variant="label" className="truncate text-fg-primary">
                  {m.nome}
                </Text>
                <Text variant="caption" className="text-fg-tertiary">
                  {m.casa === 'CAMARA' ? 'Deputado' : 'Senador'}/{m.uf}
                </Text>
              </div>
            </Link>
          </Card>
        </li>
      ))}
    </ul>
  )
}
