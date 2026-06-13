import { cn } from '@/lib/cn'

/**
 * Mapa hardcoded sigla → classes Tailwind (Wave 6 Sprint 6.0 PR 6, D4).
 *
 * Cores aproximam a identidade de marca de cada partido (cor predominante
 * em logo / banner oficial). Tom subtle (15% alpha bg, 30% alpha border,
 * texto 300/foreground-muted) para reduzir ruído visual em listagens com
 * múltiplos partidos.
 *
 * **NÃO é juízo político**. É espelhamento da identidade visual oficial
 * de cada legenda. Cidadão lê: "este é o badge do PT", não "isto é
 * vermelho porque é de esquerda".
 *
 * Siglas sem mapping caem no `DEFAULT_VARIANT` (neutro,
 * `surface-elevated`). Sincronização: manual. Adicione ao mapa quando
 * uma sigla nova aparecer em produção (regra D4 do prompt mestre Wave 6
 * — só promover a tabela `partido_cor` no DB se dor real aparecer).
 */
const PARTY_VARIANTS: Record<string, string> = {
  PT: 'bg-red-500/15 text-red-300 border-red-500/30',
  PL: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  UNIÃO: 'bg-yellow-500/15 text-yellow-200 border-yellow-500/30',
  UNIAO: 'bg-yellow-500/15 text-yellow-200 border-yellow-500/30',
  PP: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  MDB: 'bg-green-500/15 text-green-300 border-green-500/30',
  PSDB: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  REPUBLICANOS: 'bg-emerald-600/15 text-emerald-300 border-emerald-600/30',
  PSD: 'bg-blue-600/15 text-blue-300 border-blue-600/30',
  PDT: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  PSB: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  PSOL: 'bg-yellow-600/15 text-yellow-200 border-yellow-600/30',
  NOVO: 'bg-orange-600/15 text-orange-300 border-orange-600/30',
  PCdoB: 'bg-red-700/15 text-red-300 border-red-700/30',
  PCDOB: 'bg-red-700/15 text-red-300 border-red-700/30',
  AVANTE: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  CIDADANIA: 'bg-pink-500/15 text-pink-300 border-pink-500/30',
  PODE: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  SOLIDARIEDADE: 'bg-amber-600/15 text-amber-300 border-amber-600/30',
  REDE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  PV: 'bg-green-600/15 text-green-300 border-green-600/30',
  PRTB: 'bg-green-700/15 text-green-300 border-green-700/30',
}

const DEFAULT_VARIANT = 'bg-surface-raised text-fg-tertiary border-line-default'

type PartyBadgeProps = {
  /** Sigla curta do partido (PT, PL, UNIÃO, etc). Normalizada em
   * uppercase + trim antes da lookup. */
  sigla: string
  /** Nome completo do partido — usado em `aria-label`. */
  name?: string
  /** Tamanho do badge. */
  size?: 'sm' | 'md'
  className?: string
}

/**
 * PartyBadge — composição da Wave 6 (Sprint 6.0 PR 6, D4).
 *
 * Badge colorido por sigla, espelhando identidade de marca. Mapa
 * hardcoded `PARTY_VARIANTS` — siglas desconhecidas caem em variante
 * neutra (`DEFAULT_VARIANT`).
 *
 * Server Component. Sem state. Sem domínio acoplado (não consulta DB
 * nem queries) — composição puro layout/style com const local.
 *
 * Acessibilidade: `aria-label` usa `name` se fornecido (ex: "Partido dos
 * Trabalhadores"), senão `Partido ${sigla}` (ex: "Partido PT"). Leitores
 * de tela leem o badge como entidade, não apenas duas letras soltas.
 */
export function PartyBadge({
  sigla,
  name,
  size = 'md',
  className,
}: PartyBadgeProps) {
  const normalizedSigla = sigla.trim().toUpperCase()
  const variant = PARTY_VARIANTS[normalizedSigla] ?? DEFAULT_VARIANT
  const expandedLabel = name ? `Partido ${name}` : `Partido ${normalizedSigla}`

  // `<abbr>` é semanticamente correto para sigla de partido. `title`
  // fornece a expansão para leitores de tela e tooltip nativo do browser.
  // `no-underline` neutraliza o estilo default do <abbr> (dotted underline).
  return (
    <abbr
      title={expandedLabel}
      className={cn(
        'inline-flex items-center rounded-md border font-medium no-underline',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-0.5 text-sm',
        variant,
        className,
      )}
    >
      {normalizedSigla}
    </abbr>
  )
}
