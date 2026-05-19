// `/painel/configuracoes/meus-dados` — stub Wave 10 Etapa 5.
//
// Página completa (dashboard LGPD com 3 blocos: o que sabemos /
// exercer direitos / histórico) entra na Etapa 9. Por ora, stub
// honesto: link existe (não 404), mas só explica o que vem aí.

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Meus dados — Brasil à Vera',
}

export default function MeusDadosPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-16">
      <Link
        className="inline-flex items-center gap-2 text-foreground-muted text-sm hover:text-foreground"
        href="/painel/configuracoes"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Configurações
      </Link>

      <h1 className="mt-6 font-semibold text-3xl text-foreground tracking-tight">
        Meus dados
      </h1>
      <p className="mt-3 text-base text-foreground-muted">
        Em construção · Wave 10 Etapa 9 (LGPD).
      </p>
      <p className="mt-4 text-foreground-muted text-sm">
        Em breve, esta página vai mostrar tudo o que o Brasil à Vera registra
        sobre você: identidade, parlamentares acompanhados, políticas de alerta,
        reports recebidos e consentimentos. Você vai poder exportar tudo em
        JSON, pedir correção, anonimizar ou apagar sua conta, alinhado com os
        direitos do art. 18 da LGPD.
      </p>
      <p className="mt-4 text-foreground-subtle text-sm">
        Documento canônico:{' '}
        <a
          className="underline underline-offset-4 hover:text-foreground"
          href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/docs/architecture/ADR/031-framework-lgpd-area-logada.md"
          rel="noreferrer"
          target="_blank"
        >
          ADR-031
        </a>
      </p>
    </div>
  )
}
