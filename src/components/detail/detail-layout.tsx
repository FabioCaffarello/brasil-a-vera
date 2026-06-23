import type { ReactNode } from 'react'

import { SectionCard } from '@/design-system/compositions/section-card'
import { SectionNav } from '@/design-system/compositions/section-nav'
import { Accordion } from '@/design-system/primitives/rds-accordion'

/**
 * Uma seção de uma página de detalhe. Fonte ÚNICA que alimenta os três
 * consumidores que antes eram declarados em triplicata por rota:
 * o `SectionNav` (desktop), o `Accordion` (mobile) e o `SectionCard` (desktop).
 */
export interface DetailSection {
  /** Anchor id — usado pelo SectionNav (`#id`), Accordion e SectionCard. */
  id: string
  /** Label curto do SectionNav (desktop). */
  navLabel: string
  /**
   * Título do card/accordion. Default = `navLabel`. String porque o
   * `AccordionItem` do RDS exige `title: string`.
   */
  title?: string
  /** Subtítulo — renderizado só no `SectionCard` (desktop). */
  subtitle?: ReactNode
  /** Ícone do `SectionNav` (lucide-react), `aria-hidden`. */
  icon?: ReactNode
  /** Conteúdo da seção — idêntico em desktop e mobile. */
  content: ReactNode
}

interface DetailLayoutProps {
  breadcrumb: ReactNode
  /** PerfilHeader de domínio (parlamentar/proposição/votação). */
  header: ReactNode
  /** Slot opcional entre header e stats (ex.: `LeituraRapida`). */
  beforeStats?: ReactNode
  /** StatGroup (KPIs). */
  stats?: ReactNode
  sections: DetailSection[]
  /**
   * Ordem dos ids no Accordion mobile (narrativa). Default = ordem de
   * `sections` (= ordem do SectionNav/SectionCards no desktop).
   */
  mobileOrder?: string[]
  /** Ids abertos por padrão no Accordion mobile. */
  defaultOpenMobile?: string[]
  footer?: ReactNode
  /** `top` do SectionNav sticky. Default `'3.5rem'` (abaixo da navbar). */
  stickyTop?: string
}

/**
 * Casca comum das rotas de detalhe (ADR-053). Recebe os slots de domínio
 * (breadcrumb, header, KPIs, footer) e UM array `sections`, do qual deriva o
 * `SectionNav` (desktop), o `Accordion` (mobile) e a pilha de `SectionCard`
 * (desktop) — eliminando a tríplice declaração por seção que cada rota repetia.
 *
 * Dimensões preservadas em divs (`max-w-4xl`, `space-y-5`) — o `Container` do
 * RDS usa `max-w-screen-*`, escala diferente; adoção fica para issue futura.
 */
export function DetailLayout({
  breadcrumb,
  header,
  beforeStats,
  stats,
  sections,
  mobileOrder,
  defaultOpenMobile,
  footer,
  stickyTop = '3.5rem',
}: DetailLayoutProps) {
  const byId = new Map(sections.map((s) => [s.id, s]))
  const mobileSections = mobileOrder
    ? mobileOrder.flatMap((id) => {
        const s = byId.get(id)
        return s ? [s] : []
      })
    : sections

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="space-y-5">
        {breadcrumb}
        {header}
        {beforeStats}
        {stats}
      </div>

      {/* SectionNav só desktop — no mobile o Accordion abaixo já é a nav. */}
      <SectionNav
        className="mt-6 hidden sm:block"
        items={sections.map((s) => ({
          id: s.id,
          label: s.navLabel,
          icon: s.icon,
        }))}
        stickyTop={stickyTop}
      />

      <Accordion
        className="mt-6 space-y-3 sm:hidden"
        defaultOpen={defaultOpenMobile}
        items={mobileSections.map((s) => ({
          id: s.id,
          title: s.title ?? s.navLabel,
          className: 'rounded-lg border-line-default bg-surface-base',
          triggerClassName: 'font-semibold text-base',
          content: s.content,
        }))}
        type="multiple"
      />

      <div className="mt-6 hidden space-y-5 sm:block">
        {sections.map((s) => (
          <SectionCard
            id={s.id}
            key={s.id}
            subtitle={s.subtitle}
            title={s.title ?? s.navLabel}
          >
            {s.content}
          </SectionCard>
        ))}
      </div>

      {footer}
    </div>
  )
}
