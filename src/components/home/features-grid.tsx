import {
  Code2,
  HandCoins,
  Layers,
  RefreshCw,
  Shield,
  UserCheck,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

type Feature = {
  icon: ReactNode
  title: string
  description: string
}

const FEATURES: Feature[] = [
  {
    icon: <Shield className="h-5 w-5" />,
    title: 'Dados oficiais',
    description:
      'Câmara, Senado e Portal da Transparência. Nenhum dado vem de inferência.',
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
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: 'Pirâmide de Confiança',
    description: 'Todo dado tem nível L1-L4 explícito com origem visível.',
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

/**
 * FeaturesGrid — Sprint 6.1 PR 3 (Wave 6, reskin home).
 *
 * Grid de 6 features/value props da plataforma. Server Component.
 * Layout responsivo: 1 col mobile, 2 sm, 3 lg+. Hover suave via CSS
 * (ADR-023 — sem framer-motion).
 *
 * Mistura propósito cívico (Dados oficiais, Pirâmide de Confiança,
 * Sem cadastro) + features práticas (Atualizado diariamente, Open
 * source, Custo zero) — sinaliza tanto "por que confiar" quanto "como
 * sustentamos". Ícones lucide-react.
 */
export function FeaturesGrid({ className }: { className?: string }) {
  return (
    <ul
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {FEATURES.map((feature) => (
        <li
          className="rounded-lg border border-border bg-surface p-5 transition-colors duration-150 hover:border-border-strong hover:bg-surface-elevated"
          key={feature.title}
        >
          <div
            aria-hidden="true"
            className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand/10 text-brand"
          >
            {feature.icon}
          </div>
          <h3 className="mb-1 font-semibold text-foreground">
            {feature.title}
          </h3>
          <p className="text-foreground-muted text-sm">{feature.description}</p>
        </li>
      ))}
    </ul>
  )
}
