import { Users } from 'lucide-react'
import Link from 'next/link'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/design-system/primitives/card'

export function CardParlamentares() {
  return (
    <Card className="flex flex-col transition hover:border-border-strong">
      <CardHeader>
        <div
          aria-hidden
          className="mb-3 flex size-10 items-center justify-center rounded-lg bg-surface-elevated text-brand"
        >
          <Users className="size-5" />
        </div>
        <CardTitle className="text-lg">Quem está no Congresso</CardTitle>
        <CardDescription>
          Explore deputados federais e senadores em exercício — filtre por casa,
          UF, partido e veja o perfil 360 de cada parlamentar.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1" />
      <CardFooter>
        <Link
          aria-label="Explorar parlamentares"
          className="inline-flex items-center font-medium text-brand text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          href="/parlamentares"
        >
          Explorar <span aria-hidden>→</span>
        </Link>
      </CardFooter>
    </Card>
  )
}
