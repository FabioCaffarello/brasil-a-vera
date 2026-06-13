// Cópia-rds de src/components/home/card-parlamentares.tsx — onda HeroSection
// (home /). Card de entrada da home. Original INTOCADO.
//
// Card primitive → cópia local ./card (Card compound do RDS não cobre a API
// shadcn-style CardHeader/CardContent/CardFooter; ver ./card.tsx).
// href do card → /rds/parlamentares (listagem migrada na onda #1).
//
// Tradução de classnames EXCLUSIVAMENTE por docs/migration/token-map.md:
//   border-border-strong   → border-line-emphasis
//   bg-surface-elevated    → bg-surface-raised
//   text-brand             → text-fg-brand (byte-idêntico pós-#358)
//   ring-ring              → ring-line-focus

import { Users } from 'lucide-react'
import Link from 'next/link'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card'

export function CardParlamentares() {
  return (
    <Card className="flex flex-col transition hover:border-line-emphasis">
      <CardHeader>
        <div
          aria-hidden
          className="mb-3 flex size-10 items-center justify-center rounded-lg bg-surface-raised text-fg-brand"
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
          className="inline-flex items-center font-medium text-fg-brand text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
          href="/rds/parlamentares"
        >
          Explorar <span aria-hidden>→</span>
        </Link>
      </CardFooter>
    </Card>
  )
}
