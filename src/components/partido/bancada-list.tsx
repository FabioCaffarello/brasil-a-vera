import Link from 'next/link'

import type { PartidoMembro } from '@/lib/queries/partidos'

interface Props {
  membros: PartidoMembro[]
}

// Sprint 4.4 PR 1 commit 2/6 — refatorado para tokens semânticos.
// Lista de membros da bancada com link-card (avatar + nome + cargo/UF).
// Mesma intenção do `parlamentar-card` da listagem geral, mas compacto
// (sem partido na info — redundante na página do partido).
export function BancadaList({ membros }: Props) {
  if (membros.length === 0) {
    return (
      <p className="text-foreground-muted text-sm">
        Sem parlamentares registrados nesta sigla.
      </p>
    )
  }

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {membros.map((m) => (
        <li key={m.id}>
          <Link
            className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2.5 transition hover:border-border-strong hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href={`/parlamentares/${m.id}`}
          >
            {m.urlFoto ? (
              // biome-ignore lint/performance/noImgElement: foto remota; CLS evitado com width/height.
              <img
                alt=""
                className="size-10 shrink-0 rounded-full object-cover"
                height={40}
                loading="lazy"
                src={m.urlFoto}
                width={40}
              />
            ) : (
              <div
                aria-hidden="true"
                className="size-10 shrink-0 rounded-full bg-surface-elevated"
              />
            )}
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground text-sm">
                {m.nome}
              </p>
              <p className="text-foreground-muted text-xs">
                {m.casa === 'CAMARA' ? 'Deputado' : 'Senador'}/{m.uf}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
