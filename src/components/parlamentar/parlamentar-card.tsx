import Link from 'next/link'

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
 * Card de listagem de parlamentar — Sprint 4.2 PR 2 (refatorado).
 * Migrou de zinc HEX legacy para tokens semânticos OKLCH do design
 * system (Sprint 4.0 PR 2):
 *
 *   bg-white dark:bg-zinc-900   → bg-surface
 *   border-zinc-200/700         → border-border
 *   hover:border-zinc-400       → hover:border-border-strong
 *   text-zinc-900/zinc-100      → text-foreground
 *   text-zinc-600/zinc-400      → text-foreground-muted
 *   bg-zinc-200 (avatar fallback) → bg-surface-elevated
 *
 * Estrutura mantida: <Link> wrapper (inteiro card clicável) com flex
 * row (avatar + info). Dimensões explícitas no <img> (CLS=0).
 *
 * NÃO usa Card primitive aqui — Card é vertical com Header/Content/Footer;
 * este card é horizontal compacto (lista densa). Tokens são suficientes.
 */
export function ParlamentarCard({ parlamentar }: Props) {
  const { id, nome, casa, partidoSigla, uf, urlFoto } = parlamentar
  return (
    <Link
      className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 transition hover:border-border-strong hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
        <p className="mt-0.5 text-foreground-muted text-sm">
          {casa === 'CAMARA' ? 'Deputado' : 'Senador'} ·{' '}
          <span className="font-medium">{partidoSigla}</span>/{uf}
        </p>
      </div>
    </Link>
  )
}
