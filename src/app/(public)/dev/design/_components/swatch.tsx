import { cn } from '@/lib/cn'

/**
 * Color swatch — utilitário interno da página /dev/design.
 *
 * Mostra um quadrado preenchido com o token de cor + label textual + a
 * CSS var subjacente, pra QA visual rápida. NÃO é primitiva do design
 * system — vive em _components/ porque é específico desta rota.
 */
export function Swatch({
  token,
  className,
  label,
  description,
}: {
  /** Classe Tailwind que preenche o bloco (ex.: `bg-brand`, `bg-surface-elevated`). */
  className: string
  /** Nome do token semântico (ex.: "brand"). */
  token: string
  /** Label mostrada acima do swatch (ex.: "Marca / CTA principal"). */
  label: string
  /** CSS var subjacente (ex.: "var(--color-brand)"). */
  description: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="font-medium text-sm">{label}</div>
      <div
        className={cn('h-16 w-full rounded-md border border-border', className)}
        aria-hidden="true"
      />
      <div className="font-mono text-foreground-muted text-xs">
        <code>{token}</code>
      </div>
      <div className="font-mono text-foreground-subtle text-xs">
        <code>{description}</code>
      </div>
    </div>
  )
}
