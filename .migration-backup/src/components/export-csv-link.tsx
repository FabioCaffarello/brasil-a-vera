interface Props {
  /** Caminho completo do endpoint, ex.: "/api/export/parlamentares?casa=CAMARA". */
  href: string
  label?: string
}

// Link de download CSV. O Content-Disposition: attachment do endpoint faz
// o navegador baixar o arquivo em vez de navegar.
export function ExportCsvLink({ href, label = 'Exportar CSV' }: Props) {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-1.5 rounded border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      <span aria-hidden>↓</span>
      {label}
    </a>
  )
}
