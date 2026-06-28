// Promovido ao RDS (migração ADR-033) — tokens via docs/migration/token-map.md.

import Link from 'next/link'

interface Props {
  temas: Array<{ codigoTema: number; nomeTema: string }>
}

export function TemasList({ temas }: Props) {
  if (temas.length === 0) {
    return (
      <p className="text-fg-tertiary text-sm">
        Sem temas classificados ainda. A Câmara classifica temas após o
        protocolo da proposição; o Senado não disponibiliza classificação
        temática no endpoint atual.
      </p>
    )
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {temas.map((t) => (
        <li key={t.codigoTema}>
          <Link
            className="inline-flex items-center rounded-full bg-surface-raised px-3 py-1 font-medium text-fg-primary text-xs hover:bg-surface-canvas hover:text-fg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-offset-2"
            href={`/temas/${t.codigoTema}`}
          >
            {t.nomeTema}
          </Link>
        </li>
      ))}
    </ul>
  )
}
