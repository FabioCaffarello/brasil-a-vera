// Iniciais para o fallback de avatar + o type `AvatarSize` do RDS (espelhado —
// nem `./server` nem `./granular` reexportam o type). Util puro (sem
// `'use client'`) para ser importável tanto pelo wrapper client
// (`ParlamentarAvatar`) quanto pelo server (`ParlamentarAvatarBase`).

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

/** Iniciais (1ª letra do primeiro + último nome) para o fallback do avatar. */
export function iniciais(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase()
  const first = parts[0][0] ?? ''
  const last = parts[parts.length - 1][0] ?? ''
  return `${first}${last}`.toUpperCase()
}
