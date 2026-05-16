/**
 * Tokens semânticos de cor — Sprint 4.0 PR 2.
 *
 * Cada token aponta para uma CSS variable definida em `src/app/globals.css`.
 * Os valores OKLCH ficam **só** no CSS para garantir uma única fonte de verdade;
 * este módulo expõe os nomes tipados pra componentes referenciarem.
 *
 * NÃO inline valores aqui. Mude `globals.css` se o token mudar.
 *
 * Auditoria WCAG: docs/architecture/WCAG-AUDIT.md
 * Doc canônica: docs/design/DESIGN-TOKENS.md
 */

export const colors = {
  // Fundos
  background: 'var(--color-background)',
  surface: 'var(--color-surface)',
  surfaceElevated: 'var(--color-surface-elevated)',
  surfaceOverlay: 'var(--color-surface-overlay)',

  // Bordas (decorativas — não interativas; ver WCAG-AUDIT)
  border: 'var(--color-border)',
  borderStrong: 'var(--color-border-strong)',

  // Texto
  foreground: 'var(--color-foreground)',
  foregroundMuted: 'var(--color-foreground-muted)',
  foregroundSubtle: 'var(--color-foreground-subtle)',

  // Marca (novo semantic token — separado da paleta institucional --color-primary-*)
  brand: 'var(--color-brand)',
  brandForeground: 'var(--color-brand-foreground)',

  // Estados
  success: 'var(--color-success)',
  successForeground: 'var(--color-success-foreground)',
  warning: 'var(--color-warning)',
  warningForeground: 'var(--color-warning-foreground)',
  destructive: 'var(--color-destructive)',
  destructiveForeground: 'var(--color-destructive-foreground)',

  // Foco (WCAG 2.4.7)
  ring: 'var(--color-ring)',

  // Acento narrativo Wave 6 (ADR-024) — inflexão narrativa, NÃO estado nem CTA primário.
  // Uso restrito: badge contexto hero, gradient overlay, chip narrativo.
  accent: 'var(--color-accent)',
  accentForeground: 'var(--color-accent-foreground)',

  // Charts (Recharts — Sprint 4.3+ se entrar)
  chart1: 'var(--color-chart-1)',
  chart2: 'var(--color-chart-2)',
  chart3: 'var(--color-chart-3)',
  chart4: 'var(--color-chart-4)',
  chart5: 'var(--color-chart-5)',
} as const

export type ColorToken = keyof typeof colors
