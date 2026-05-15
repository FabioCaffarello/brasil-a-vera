interface Props {
  temas: Array<{ codigoTema: number; nomeTema: string }>
}

export function TemasList({ temas }: Props) {
  if (temas.length === 0) {
    return (
      <p className="text-foreground-muted text-sm">
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
          className="inline-flex items-center rounded-full bg-surface-elevated px-3 py-1 font-medium text-foreground text-xs"
          key={t.codigoTema}
        >
          {t.nomeTema}
        </li>
      ))}
    </ul>
  )
}
