'use client'

import { NavLink as RdsNavLink } from '@fabio.caffarello/react-design-system'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export type NavLink = {
  href: string
  label: string
}

// Auditoria UX 2026-07-20 (P1.7): Rankings entrou no menu (feature core sem
// nenhum ponto de entrada na navegação); Docs saiu para o footer ("Como ler
// os dados" + "Metodologia"), que também ganhou Vetos/Frentes/Comparar/Feed.
// Trocar 1-por-1 mantém a largura do menu em md (7 itens estouram).
export const NAV_LINKS: NavLink[] = [
  { href: '/quem-me-representa', label: 'Quem me representa' },
  { href: '/parlamentares', label: 'Parlamentares' },
  { href: '/proposicoes', label: 'Proposições' },
  { href: '/votacoes', label: 'Votações' },
  { href: '/rankings', label: 'Rankings' },
  { href: '/temas', label: 'Temas' },
]

// Rotas secundárias — não cabem no menu desktop; aparecem no painel mobile
// (abaixo de um divisor) e no footer.
export const NAV_LINKS_SECUNDARIOS: NavLink[] = [
  { href: '/vetos', label: 'Vetos presidenciais' },
  { href: '/frentes', label: 'Frentes parlamentares' },
  { href: '/comparar', label: 'Comparar parlamentares' },
  { href: '/feed', label: 'Feeds RSS' },
  { href: '/docs', label: 'Como ler os dados' },
]

export function isNavLinkActive(pathname: string | null, href: string) {
  if (href === '/') return pathname === '/'
  return pathname?.startsWith(href) ?? false
}

interface Props {
  /**
   * Wave 10 Hotfix 10.3 — link único da área pessoal (`/painel`),
   * renderizado **antes** de NAV_LINKS quando o usuário está
   * autenticado. Resolvido server-side via `auth()` no Navbar e
   * passado por prop (regra Hotfix 10.3: nada de `useAuth()` /
   * `useUser()` aqui; sem flicker de hydration).
   *
   * `undefined` ou `null` = anônimo → nada extra renderiza.
   */
  personalLink?: NavLink | null
}

/**
 * NavLinks — desktop horizontal (≥ md). Mobile usa <NavMobile />.
 *
 * Construído sobre o `NavLink` do RDS (ADR-053, camada compositiva):
 * variant="background" (fundo no active), size="sm". `as={Link}` é
 * obrigatório — o `useNavLink` deste build retorna `NextLink: undefined`,
 * então sem `as` o NavLink degrada para `<a>` cru (perde soft-nav do App
 * Router). O estado ativo (`active`) e o `aria-current="page"` (WCAG
 * 2.4.8 / 4.1.2) são derivados por `isNavLinkActive` (startsWith), não
 * pela auto-detecção de pathname do RDS — a semântica startsWith é
 * compartilhada com <NavMobile />.
 *
 * Todos os links têm peso visual uniforme — sem diferenciação por área
 * (decisão Hotfix 10.3 Proposta C: "Painel" entra como item primeiro
 * sem ícone/divisor; sinaliza prioridade por posição, não por estilo).
 *
 * Cliente apenas para usePathname(). Sem outros listeners.
 */
export function NavLinks({ personalLink }: Props = {}) {
  const pathname = usePathname()
  const links: NavLink[] = personalLink
    ? [personalLink, ...NAV_LINKS]
    : NAV_LINKS

  return (
    <ul className="hidden items-center gap-1.5 text-sm md:flex">
      {links.map((link) => {
        const isActive = isNavLinkActive(pathname, link.href)

        return (
          <li key={link.href}>
            <RdsNavLink
              active={isActive}
              as={Link}
              href={link.href}
              size="sm"
              variant="background"
            >
              {link.label}
            </RdsNavLink>
          </li>
        )
      })}
    </ul>
  )
}
