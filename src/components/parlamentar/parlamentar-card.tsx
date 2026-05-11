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

export function ParlamentarCard({ parlamentar }: Props) {
  const { id, nome, casa, partidoSigla, uf, urlFoto } = parlamentar
  return (
    <Link
      href={`/parlamentares/${id}`}
      className="flex items-center gap-4 rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
    >
      {urlFoto ? (
        // biome-ignore lint/performance/noImgElement: dynamic remote, sem domain config no Next 16 ainda
        <img
          src={urlFoto}
          alt=""
          loading="lazy"
          className="size-14 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div className="size-14 shrink-0 rounded-full bg-zinc-200 dark:bg-zinc-700" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
          {nome}
        </p>
        <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
          {casa === 'CAMARA' ? 'Deputado' : 'Senador'} ·{' '}
          <span className="font-medium">{partidoSigla}</span>/{uf}
        </p>
      </div>
    </Link>
  )
}
