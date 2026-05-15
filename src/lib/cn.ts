import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Compositor de classes Tailwind seguro contra colisões.
 *
 * `clsx` resolve condicionais/arrays/objetos para strings.
 * `tailwind-merge` resolve conflitos no estilo "bg-red-500 bg-blue-500" → "bg-blue-500".
 *
 * Uso típico (em componentes do design system):
 *
 *   cn('px-3 py-2 rounded-md', isActive && 'bg-primary text-primary-foreground')
 *
 * Adotado pelo padrão shadcn/ui curado (ver ADR-021).
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
