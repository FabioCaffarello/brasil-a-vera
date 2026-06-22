// Busca por tema (ADR-050) — lista a taxonomia oficial (proposicao_tema).
// O cidadão entra por ASSUNTO. Ordenado por nº de proposições.

import { HeroSection } from '@fabio.caffarello/react-design-system/server'
import { Tags } from 'lucide-react'
import Link from 'next/link'

import { getTemas } from '@/lib/queries/temas'

// Dynamic por necessidade do build (igual a /partidos/[sigla] e home): a página
// consome query de DB e não é filtrada por searchParams; o cache vive na query
// (cached/ADR-018), não no prerender estático.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Temas — Brasil à Vera',
  description:
    'Explore por assunto: veja os temas das proposições e quem mais legisla sobre cada um.',
}

export default async function TemasPage() {
  const temas = await getTemas()

  return (
    <>
      <HeroSection
        align="center"
        description="Entre por assunto: cada tema reúne as proposições classificadas pela própria Câmara e quem mais as propõe."
        kicker={<Tags className="mx-auto h-5 w-5 text-accent" />}
        title="Explorar por tema"
        variant="plain"
      />

      <div className="mx-auto max-w-4xl px-4 py-8">
        {temas.length === 0 ? (
          <p className="text-fg-tertiary text-sm">
            Nenhum tema classificado nas proposições ingeridas.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {temas.map((t) => (
              <li key={t.codigo}>
                <Link
                  className="flex items-center justify-between gap-3 rounded-lg border border-line-default p-3 hover:bg-surface-raised"
                  href={`/temas/${t.codigo}`}
                >
                  <span className="text-fg-primary text-sm">{t.nome}</span>
                  <span className="shrink-0 text-fg-tertiary text-xs tabular-nums">
                    {t.proposicoes}{' '}
                    {t.proposicoes === 1 ? 'proposição' : 'proposições'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-6 text-fg-tertiary text-xs">
          Classificação temática oficial da Câmara. Cobre apenas as proposições
          já ingeridas e classificadas — a cobertura cresce com a ingestão.
        </p>
      </div>
    </>
  )
}
