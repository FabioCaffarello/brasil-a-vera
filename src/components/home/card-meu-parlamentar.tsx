import { MapPin } from 'lucide-react'
import Link from 'next/link'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/design-system/primitives/card'

/**
 * Card 1 da home — Sprint 4.1 PR 4 (refatorado).
 * Consome `Card` primitive + tokens semânticos do design system
 * (foreground, foreground-muted, brand). Visual hierarquia preservada
 * vs Sprint 3.1 Tarefa 2.
 */
export function CardMeuParlamentar() {
  return (
    <Card className="flex flex-col transition hover:border-border-strong">
      <CardHeader>
        <div
          aria-hidden
          className="mb-3 flex size-10 items-center justify-center rounded-lg bg-surface-elevated text-brand"
        >
          <MapPin className="size-5" />
        </div>
        <CardTitle className="text-lg">Quem representa seu estado</CardTitle>
        <CardDescription>
          Veja os deputados federais e senadores do seu estado. A representação
          no Congresso é estadual, não municipal.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1" />
      <CardFooter>
        <Link
          aria-label="Encontrar meus representantes a partir do estado"
          className="inline-flex items-center font-medium text-brand text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          href="/o-meu-parlamentar"
        >
          Encontrar <span aria-hidden>→</span>
        </Link>
      </CardFooter>
    </Card>
  )
}
