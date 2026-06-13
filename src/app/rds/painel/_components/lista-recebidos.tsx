// Cópia-rds de src/components/painel/alertas/lista-recebidos.tsx — migração
// painel (área logada /rds/painel). Server Component (renderiza markdown
// server-side, sem custo no bundle do client).
//
// Original INTOCADO. Tradução de classnames EXCLUSIVAMENTE por
// docs/migration/token-map.md:
//   border-border         → border-line-default
//   bg-surface            → bg-surface-base
//   text-foreground       → text-fg-primary
//   text-foreground-muted → text-fg-tertiary
//
// `ItemRecebido` importado do ORIGINAL (client island — accordion + marcação
// de leitura). `renderMarkdown` da lib (lógica pura, preservada).

import { ItemRecebido } from '@/components/painel/alertas/item-recebido'
import { renderMarkdown } from '@/lib/markdown'

interface Delivery {
  id: string
  subject: string
  bodyMd: string
  scheduledFor: Date
  readAt: Date | null
}

interface Props {
  deliveries: Delivery[]
}

export function ListaRecebidos({ deliveries }: Props) {
  if (deliveries.length === 0) {
    return (
      <div className="rounded-lg border border-line-default bg-surface-base p-8 text-center">
        <h3 className="font-medium text-fg-primary text-lg">Caixa vazia</h3>
        <p className="mt-2 text-fg-tertiary text-sm">
          Os reports semanais aparecem aqui assim que o cron processar os
          parlamentares que você acompanha (domingo 18:00 BRT).
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {deliveries.map((d) => (
        <li key={d.id}>
          <ItemRecebido
            bodyHtml={renderMarkdown(d.bodyMd)}
            id={d.id}
            initialReadAt={d.readAt ? d.readAt.toISOString() : null}
            scheduledFor={d.scheduledFor.toISOString()}
            subject={d.subject}
          />
        </li>
      ))}
    </ul>
  )
}
