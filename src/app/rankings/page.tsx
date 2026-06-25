// Índice dos rankings de transparência — Sprint 16.0.
// Cada card linka para um ranking específico.

import { Breadcrumb } from '@fabio.caffarello/react-design-system/server'
import { Receipt, Scale, TrendingUp } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

export const revalidate = 86400

export const metadata: Metadata = {
  title: 'Rankings de transparência — Brasil à Vera',
  description:
    'Explore rankings de variação patrimonial, gastos da cota parlamentar e disciplina partidária dos parlamentares brasileiros.',
}

const RANKINGS = [
  {
    href: '/rankings/patrimonio',
    icon: TrendingUp,
    iconClass: 'text-green-600',
    title: 'Variação patrimonial',
    description:
      'Quem mais enriqueceu (ou perdeu) patrimônio entre dois pleitos consecutivos, corrigido pelo IPCA. Câmara-only.',
  },
  {
    href: '/rankings/gastos',
    icon: Receipt,
    iconClass: 'text-orange-600',
    title: 'Gastos da cota parlamentar',
    description:
      'Maiores consumidores da CEAP no ano corrente — passagens, alimentação, hospedagem e demais itens cobertos pela cota.',
  },
  {
    href: '/rankings/alinhamento',
    icon: Scale,
    iconClass: 'text-blue-600',
    title: 'Disciplina partidária',
    description:
      'Quem vota mais junto com o partido e quem diverge mais. Calculado sobre votações nominais no plenário.',
  },
]

export default function RankingsIndexPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <Breadcrumb
        items={[{ label: 'Início', href: '/' }, { label: 'Rankings' }]}
      />

      <div className="mt-6 mb-8">
        <h1 className="font-bold text-2xl text-fg-primary tracking-tight sm:text-3xl">
          Rankings de transparência
        </h1>
        <p className="mt-2 text-fg-secondary text-sm">
          Classifique os parlamentares pelos dados públicos disponíveis — sem
          julgamento de mérito, só fatos factuais.
        </p>
      </div>

      <ul className="space-y-4">
        {RANKINGS.map(({ href, icon: Icon, iconClass, title, description }) => (
          <li key={href}>
            <Link
              href={href}
              className="group flex items-start gap-4 rounded-lg border border-line-default bg-surface-base p-5 transition-colors hover:bg-surface-raised"
            >
              <Icon
                className={`mt-0.5 h-5 w-5 shrink-0 ${iconClass}`}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="font-semibold text-fg-primary group-hover:underline">
                  {title}
                </p>
                <p className="mt-1 text-fg-secondary text-sm">{description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
