// src/components/partido/header.tsx — consome o RDS (tokens traduzidos
// via docs/migration/token-map.md; promovido do staging /rds/). Sem
// hooks; renderiza no servidor.

import { Text } from '@fabio.caffarello/react-design-system/server'

interface Props {
  sigla: string
  nomeOficial: string | null
  totalParlamentares: number
}

export function PartidoHeader({
  sigla,
  nomeOficial,
  totalParlamentares,
}: Props) {
  return (
    <header className="space-y-2">
      <p className="font-mono text-fg-tertiary text-xs uppercase tracking-wider">
        Partido
      </p>
      <h1 className="font-bold text-3xl text-fg-primary">{sigla}</h1>
      {nomeOficial && nomeOficial !== sigla && (
        <Text variant="bodySmall" className="text-fg-tertiary">
          {nomeOficial}
        </Text>
      )}
      <Text variant="bodySmall" className="text-fg-tertiary">
        {totalParlamentares === 0
          ? 'Nenhum parlamentar atualmente filiado nesta sigla.'
          : `${totalParlamentares} ${totalParlamentares === 1 ? 'parlamentar' : 'parlamentares'} no Brasil à Vera.`}
      </Text>
    </header>
  )
}
