// src/components/partido/top-temas.tsx — consome o RDS (tokens
// traduzidos via docs/migration/token-map.md; promovido do staging /rds/).
// Server Component puro — <ol> com tema + contagem.

import { Text } from '@fabio.caffarello/react-design-system/server'

import type { TemaContagem } from '@/lib/queries/partidos'

interface Props {
  temas: TemaContagem[]
}

export function TopTemasPartido({ temas }: Props) {
  if (temas.length === 0) {
    return (
      <Text variant="bodySmall" className="text-fg-tertiary">
        Nenhuma proposição autorada por membros desta bancada na base atual.
      </Text>
    )
  }

  return (
    <ol className="space-y-2">
      {temas.map((t) => (
        <li
          className="flex items-center justify-between gap-3 text-sm"
          key={t.nomeTema}
        >
          <span className="text-fg-primary">{t.nomeTema}</span>
          <span className="font-medium tabular-nums text-fg-tertiary">
            {t.contagem}
          </span>
        </li>
      ))}
    </ol>
  )
}
