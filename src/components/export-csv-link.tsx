import { Button } from '@fabio.caffarello/react-design-system/server'
import { Download } from 'lucide-react'

interface Props {
  /** Caminho completo do endpoint, ex.: "/api/export/parlamentares?casa=CAMARA". */
  href: string
  label?: string
}

// Link de download CSV. O `Content-Disposition: attachment` do endpoint faz
// o navegador baixar o arquivo em vez de navegar.
//
// Sprint 4.2 PR 3 — migrado para Button primitive + tokens semânticos.
// `asChild` preserva semântica de <a download> (single elemento, sem
// nested interactive). Ícone Lucide substitui o glyph "↓" decorativo.
export function ExportCsvLink({ href, label = 'Exportar CSV' }: Props) {
  return (
    <Button asChild size="sm" variant="outline">
      <a download href={href}>
        <Download aria-hidden className="size-3.5" />
        {label}
      </a>
    </Button>
  )
}
