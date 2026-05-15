/**
 * Tokens de motion — Sprint 4.0 PR 2.
 *
 * IMPORTANTE: globals.css aplica `@media (prefers-reduced-motion: reduce)`
 * zerando todas as durações com `!important`. Os tokens abaixo são "valores
 * de design"; em produção, o navegador aplica reduced motion automaticamente
 * para usuários que pedirem.
 *
 * Easing curves baseadas em Material Design 3 / iOS 17 (UI-padrão estável):
 * - emphasized: entradas e saídas com ênfase (modal abre)
 * - standard: transições gerais (hover, focus)
 * - accelerate: elementos que saem da tela
 * - decelerate: elementos que entram
 */
export const motion = {
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasized: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
    accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
    decelerate: 'cubic-bezier(0, 0, 0, 1)',
  },
} as const

export type DurationToken = keyof typeof motion.duration
export type EasingToken = keyof typeof motion.easing
