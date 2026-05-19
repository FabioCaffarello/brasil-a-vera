// Sub-tab Recebidos (real) — Wave 10 Etapa 7.4.
//
// Substitui o stub da Etapa 6. RSC: recebe deliveries pré-buscadas
// pela page, renderiza markdown server-side (via marked, sem custo
// no bundle do client) e passa HTML pronto para `<ItemRecebido />`
// (client, accordion + marcação de leitura).

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
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <h3 className="font-medium text-foreground text-lg">Caixa vazia</h3>
        <p className="mt-2 text-foreground-muted text-sm">
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
