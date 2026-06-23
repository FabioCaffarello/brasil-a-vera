import {
  Card,
  CardActions,
  CardHeader,
  CardSubtitle,
  CardTitle,
} from '@fabio.caffarello/react-design-system/server'
import {
  Code2,
  HandCoins,
  Layers,
  RefreshCw,
  Shield,
  UserCheck,
} from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

type Feature = {
  icon: ReactNode
  title: string
  description: string
  /** Destino opcional — renderiza CTA "Saiba mais →" no rodapé do item. */
  href?: string
  /** Rótulo do CTA. Default: "Saiba mais". */
  cta?: string
  /** Se true, abre em nova aba (links externos). */
  external?: boolean
}

const FEATURES: Feature[] = [
  {
    icon: <Shield className="h-5 w-5" />,
    title: 'Dados oficiais',
    description:
      'Câmara, Senado e Portal da Transparência. Nenhum dado vem de inferência.',
    href: '/docs/fontes',
    cta: 'Ver fontes',
  },
  {
    icon: <RefreshCw className="h-5 w-5" />,
    title: 'Atualizado diariamente',
    description: 'Crons no GitHub Actions sincronizam dados ao longo do dia.',
  },
  {
    icon: <Code2 className="h-5 w-5" />,
    title: 'Open source',
    description:
      'Código aberto no GitHub. Auditável. Contribuições bem-vindas.',
    href: 'https://github.com/FabioCaffarello/brasil-a-vera',
    cta: 'Ver repositório',
    external: true,
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: 'Pirâmide de Confiança',
    description: 'Todo dado tem nível L1-L4 explícito com origem visível.',
    href: '/docs/piramide-de-confianca',
    cta: 'Entender os níveis',
  },
  {
    icon: <UserCheck className="h-5 w-5" />,
    title: 'Sem cadastro',
    description:
      'Visite e consulte sem precisar criar conta. Privacidade preservada.',
  },
  {
    icon: <HandCoins className="h-5 w-5" />,
    title: 'Custo zero',
    description: 'Mantido por doação. Infraestrutura serverless near-zero.',
  },
]

export function FeaturesGrid({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {FEATURES.map((feature) => (
        <Card
          className="flex h-full flex-col transition-colors hover:border-line-emphasis"
          key={feature.title}
        >
          <CardHeader>
            <div
              aria-hidden="true"
              className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-fg-brand/10 text-fg-brand"
            >
              {feature.icon}
            </div>
            <CardTitle as="h3">{feature.title}</CardTitle>
            <CardSubtitle>{feature.description}</CardSubtitle>
          </CardHeader>
          {feature.href && (
            <CardActions className="mt-auto">
              <Link
                className="inline-flex items-center font-medium text-fg-brand text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
                href={feature.href}
                {...(feature.external
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
              >
                {feature.cta ?? 'Saiba mais'}{' '}
                <span aria-hidden className="ml-1">
                  →
                </span>
              </Link>
            </CardActions>
          )}
        </Card>
      ))}
    </div>
  )
}
