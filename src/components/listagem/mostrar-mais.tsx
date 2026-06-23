import { Button } from '@fabio.caffarello/react-design-system/server'

import { formatNumeroAbreviado } from '@/lib/format-number'

/**
 * Link "Mostrar mais" da paginação por cursor (ADR-026 §4). `<a>` puro,
 * zero-JS, com anchor `#mostrar-mais` que mantém o scroll visual após paginar.
 * Server Component — compartilhado pelas 3 listagens (parlamentares,
 * proposições, votações), que antes replicavam este markup inline.
 *
 * Renderize apenas quando `nextCursor` existe. `restantes`: total após a 1ª
 * página (mostra "(N restantes)"); `null` em páginas subsequentes.
 */
export function MostrarMais({
  href,
  restantes,
}: {
  href: string
  restantes: number | null
}) {
  return (
    <div className="flex justify-center" id="mostrar-mais">
      <Button asChild variant="outline">
        <a href={href}>
          {restantes !== null
            ? `Mostrar mais (${formatNumeroAbreviado(restantes)} restantes)`
            : 'Mostrar mais'}
        </a>
      </Button>
    </div>
  )
}
