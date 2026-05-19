// Sub-tab Recebidos (stub) — Wave 10 Etapa 6.
//
// Inbox real (`alert_delivery`) entra na Etapa 7. Por ora, placeholder
// honesto explicando o que vem aí. Consistente com o stub
// `/painel/configuracoes/meus-dados` da Etapa 5.

export function ListaRecebidos() {
  return (
    <div className="rounded-lg border border-border bg-surface p-8 text-center">
      <h3 className="font-medium text-foreground text-lg">
        Sua caixa de reports aparece aqui
      </h3>
      <p className="mt-2 text-foreground-muted text-sm">
        Em breve · Wave 10 Etapa 7 (Resend + cron semanal).
      </p>
      <p className="mt-3 text-foreground-subtle text-sm">
        Toda semana, um report consolidado dos parlamentares que você acompanha
        — entregue por e-mail e também listado aqui para consulta retroativa.
      </p>
    </div>
  )
}
