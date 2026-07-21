// Índice dos rankings de transparência — Sprint 16.0.
// Cada card linka para um ranking específico.

import {
  Breadcrumb,
  HeroSection,
} from '@fabio.caffarello/react-design-system/server'
import {
  FileText,
  GitMerge,
  Receipt,
  Scale,
  TrendingUp,
  UserCheck,
} from 'lucide-react'
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
      'Quem mais enriqueceu (ou perdeu) patrimônio entre dois pleitos consecutivos, corrigido pelo IPCA. Câmara + Senado (88,9%).',
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
  {
    href: '/rankings/presenca',
    icon: UserCheck,
    iconClass: 'text-green-600',
    title: 'Presença em plenário',
    description:
      'Quem mais comparece (e quem mais falta) às votações nominais no plenário, calculado na janela do mandato de cada parlamentar.',
  },
  {
    href: '/rankings/proposicoes',
    icon: FileText,
    iconClass: 'text-purple-600',
    title: 'Produção legislativa',
    description:
      'Parlamentares com maior número de proposições apresentadas na legislatura corrente — projetos de lei, emendas, requerimentos e demais matérias registradas.',
  },
  {
    href: '/rankings/coerencia',
    icon: GitMerge,
    iconClass: 'text-teal-600',
    title: 'Coerência de voto',
    description:
      'Quem vota de forma mais consistente — e quem apresenta mais pares contraditórios em proposições do mesmo tema com direções semânticas opostas.',
  },
]

export default function RankingsIndexPage() {
  return (
    <>
      <div className="mx-auto max-w-3xl pt-8">
        <Breadcrumb
          items={[{ label: 'Início', href: '/' }, { label: 'Rankings' }]}
        />
      </div>
      {/* P2.10 (auditoria UX 2026-07-20): header padronizado no
          HeroSection centralizado, como nas rotas core. */}
      <HeroSection
        align="center"
        description={
          'Classifique os parlamentares pelos dados públicos disponíveis — sem julgamento de mérito, só fatos factuais.'
        }
        title="Rankings de transparência"
        variant="plain"
      />
      <div className="mx-auto max-w-3xl pb-8">
        <ul className="space-y-4">
          {RANKINGS.map(
            ({ href, icon: Icon, iconClass, title, description }) => (
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
                    <p className="mt-1 text-fg-secondary text-sm">
                      {description}
                    </p>
                  </div>
                </Link>
              </li>
            ),
          )}
        </ul>
      </div>
    </>
  )
}
