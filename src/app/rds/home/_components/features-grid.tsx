// Cópia-rds de src/components/home/features-grid.tsx — onda HeroSection
// (home /). Grid de 6 value props da plataforma. Server Component, sem
// domínio, sem href. Original INTOCADO.
//
// Tradução de classnames EXCLUSIVAMENTE por docs/migration/token-map.md:
//   border-border           → border-line-default
//   border-border-strong    → border-line-emphasis
//   bg-surface              → bg-surface-base
//   bg-surface-elevated     → bg-surface-raised
//   bg-brand/10 text-brand  → bg-fg-brand/10 text-fg-brand
//     (base brand byte-idêntica pós-#358; opacidade aritmética —
//      generalização piloto-5 do par brand em papel utility)
//   text-foreground{,-muted}→ text-fg-{primary,tertiary}

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
          className="rounded-lg border border-line-default bg-surface-base p-5 transition-colors duration-150 hover:border-line-emphasis hover:bg-surface-raised"
          key={feature.title}
        >
          <div
            aria-hidden="true"
            className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-fg-brand/10 text-fg-brand"
          >
            {feature.icon}
          </div>
          <h3 className="mb-1 font-semibold text-fg-primary">
            {feature.title}
          </h3>
          <p className="text-fg-tertiary text-sm">{feature.description}</p>
        </li>
      ))}
    </ul>
  )
}
