import { MapPin } from 'lucide-react'
import Link from 'next/link'

// Card 1 da home — Sprint 3.1 Tarefa 2. Entrada narrativa para
// /o-meu-parlamentar, com copy pedagógico (Variante A).
export function CardMeuParlamentar() {
  return (
    <article className="flex flex-col rounded-xl border border-zinc-200 bg-white p-6 shadow-md transition hover:border-primary-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-primary-600">
      <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300">
        <MapPin aria-hidden className="size-5" />
      </div>
      <h3 className="mb-2 font-semibold text-lg text-zinc-900 dark:text-zinc-100">
        Quem representa seu estado
      </h3>
      <p className="mb-4 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Veja os deputados federais e senadores do seu estado. A representação no
        Congresso é estadual, não municipal.
      </p>
      <Link
        href="/o-meu-parlamentar"
        className="inline-flex items-center font-medium text-primary-700 text-sm hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:text-primary-300 dark:hover:text-primary-100"
        aria-label="Encontrar meus representantes a partir do estado"
      >
        Encontrar <span aria-hidden>→</span>
      </Link>
    </article>
  )
}
