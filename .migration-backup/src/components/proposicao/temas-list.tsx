interface Props {
  temas: Array<{ codigoTema: number; nomeTema: string }>
}

export function TemasList({ temas }: Props) {
  if (temas.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Sem temas classificados ainda. A Câmara classifica temas após o
        protocolo da proposição; o Senado não disponibiliza classificação
        temática no endpoint atual.
      </p>
    )
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {temas.map((t) => (
        <li
          key={t.codigoTema}
          className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
        >
          {t.nomeTema}
        </li>
      ))}
    </ul>
  )
}
