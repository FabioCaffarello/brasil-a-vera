/**
 * Tokens de sombra — Sprint 4.0 PR 2.
 * Classes utilitárias estão em globals.css `@layer utilities`.
 *
 * Quando aplicar:
 * - `glow`  — cards CTA elevados (apenas em pontos focais; usar com moderação)
 * - `soft`  — cards de listagem hover state
 *
 * Tailwind built-ins (`shadow-sm`, `shadow-md`) seguem disponíveis.
 */
export const shadows = {
  glow: 'shadow-glow',
  soft: 'shadow-soft',
} as const

export type ShadowToken = keyof typeof shadows
