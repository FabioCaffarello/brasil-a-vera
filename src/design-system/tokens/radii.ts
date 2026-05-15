/**
 * Tokens de border-radius — Sprint 4.0 PR 2.
 * Valores em globals.css (@theme inline). Veja docs/design/DESIGN-TOKENS.md.
 */
export const radii = {
  sm: 'var(--radius-sm)', // 0.25rem (4px) — controles densos
  md: 'var(--radius-md)', // 0.375rem (6px) — inputs, badges
  lg: 'var(--radius-lg)', // 0.5rem (8px) — cards padrão
  xl: 'var(--radius-xl)', // 0.75rem (12px) — cards CTA elevados
  '2xl': 'var(--radius-2xl)', // 1rem (16px) — heroes, modals
  full: '9999px', // pills, avatares
} as const

export type RadiusToken = keyof typeof radii
