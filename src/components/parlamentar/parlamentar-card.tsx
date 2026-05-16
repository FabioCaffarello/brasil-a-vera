import Link from 'next/link'

import { PartyBadge } from '@/design-system/compositions/party-badge'

interface Props {
  parlamentar: {
    id: string
    nome: string
    casa: string
    partidoSigla: string
    uf: string
    urlFoto: string | null
  }
}

/**
 * Card de listagem de parlamentar — Sprint 6.2 PR 1 (Wave 6, reskin
 * listagens).
 *
 * Mudanças vs Sprint 4.2 PR 2:
 * - Sigla de partido agora consome `<PartyBadge size="sm">` (composição
 *   Sprint 6.0 PR 6) — cor por identidade visual oficial via map
 *   hardcoded D4 do prompt mestre
 * - Hover sutil mantido (`hover:border-border-strong hover:shadow-sm`,
 *   `hover:bg-surface-elevated`); sem gradient overlay nem seta diagonal
 *   (D3 — princípio "lista densa > visual flashy")
 * - Estrutura mantida: Link wrapper horizontal compacto, foto remota
 *   com dimensões explícitas (CLS=0), focus ring via `--ring`
 *
 * Boundary OK: importa de `@/design-system/compositions/party-badge`
 * (composições disponíveis para components/<contexto>/).
 */
export function ParlamentarCard({ parlamentar }: Props) {
  const { id, nome, casa, partidoSigla, uf, urlFoto } = parlamentar
  return (
    <Link
      className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      href={`/parlamentares/${id}`}
    >
      {urlFoto ? (
        // biome-ignore lint/performance/noImgElement: foto remota (camara.leg.br / senado.leg.br); dimensões explícitas evitam CLS.
        <img
          alt=""
          className="size-14 shrink-0 rounded-full object-cover"
          height={56}
          loading="lazy"
          src={urlFoto}
          width={56}
        />
      ) : (
        <div
          aria-hidden="true"
          className="size-14 shrink-0 rounded-full bg-surface-elevated"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{nome}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-foreground-muted text-sm">
          <span>{casa === 'CAMARA' ? 'Deputado' : 'Senador'}</span>
          <PartyBadge sigla={partidoSigla} size="sm" />
          <span aria-hidden>·</span>
          <span>{uf}</span>
        </div>
      </div>
    </Link>
  )
}
