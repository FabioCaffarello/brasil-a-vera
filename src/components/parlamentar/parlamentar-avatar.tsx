'use client'

// Wrapper de domínio sobre o `Avatar` do RDS (ADR-053). Importa do `/granular`
// DENTRO de um módulo client — mesmo padrão de `rds-accordion` — para não criar
// client reference do barrel inteiro (+294KB) num Server Component.
//
// Encapsula o contrato de "foto de parlamentar": fallback de iniciais (fotos de
// camara.leg.br/senado.leg.br às vezes 404), `aria-label` em PT e `variant`
// circular. É o alvo de consolidação dos 10+ sítios que hoje repetem
// `<img rounded-full>` cru. Avatar destravado pelo RDS v4.7 (loading=lazy +
// sizes 2xl/3xl — issues #247/#248).

import { Avatar } from '@fabio.caffarello/react-design-system/granular'

// Espelha `AvatarSize` do RDS v4.7 (o /granular não reexporta o type).
type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl'

/** Iniciais (1ª letra do primeiro + último nome) para o fallback do Avatar. */
export function iniciais(nome: string): string {
  const parts = nome.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return (parts[0][0] ?? '?').toUpperCase()
  const first = parts[0][0] ?? ''
  const last = parts[parts.length - 1][0] ?? ''
  return `${first}${last}`.toUpperCase()
}

interface Props {
  nome: string
  urlFoto: string | null
  size: AvatarSize
  /**
   * `lazy` em listagens (24 fotos/página, abaixo da dobra); omitir (eager) na
   * imagem hero única do perfil. Mapeia direto p/ `<img loading>` (RDS #247).
   */
  loading?: 'lazy' | 'eager'
  /** Override de dimensão/posição (ex.: `size-14 shrink-0`, `sm:size-28`). */
  className?: string
}

/**
 * Foto de parlamentar sobre o `Avatar` do RDS. `urlFoto` null ou imagem
 * quebrada → fallback de iniciais (o Avatar trata o `onError`).
 */
export function ParlamentarAvatar({
  nome,
  urlFoto,
  size,
  loading,
  className,
}: Props) {
  return (
    <Avatar
      alt=""
      aria-label={`Foto de ${nome}`}
      className={className}
      fallback={iniciais(nome)}
      loading={loading}
      size={size}
      src={urlFoto ?? undefined}
      variant="circle"
    />
  )
}
