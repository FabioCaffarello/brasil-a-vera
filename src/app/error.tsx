'use client'

// Error boundary do app — substitui o default do Next (fundo branco, copy em
// inglês "This page couldn't load"), visto em produção quando uma rota falha
// (auditoria UX 2026-07-20, P0.1/P0.2 — 500 intermitente sob rajada no Neon).
// Client obrigatório (contrato do App Router); Button via /granular para não
// puxar o barrel client inteiro (+294KB), mesmo padrão de rds-accordion.

import { Button } from '@fabio.caffarello/react-design-system/granular'
import { RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log estruturado no console do browser — o server-side já registra o
    // digest no Workers; aqui é só para correlação em report de usuário.
    console.error('route_error', error.digest ?? error.message)
  }, [error])

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center px-6 py-16">
      <div className="w-full rounded-lg border border-line-default border-dashed bg-surface-base/50 p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-surface-raised text-fg-tertiary">
          <RefreshCw aria-hidden className="size-6" />
        </div>
        <h1 className="mt-4 font-semibold text-fg-primary text-lg">
          Algo deu errado ao carregar esta página
        </h1>
        <p className="mt-2 text-fg-tertiary text-sm">
          Falha temporária ao consultar os dados — costuma resolver em segundos.
          Tente de novo; se persistir, volte ao início.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-fg-quaternary text-xs">
            código {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={reset} size="sm">
            Tentar de novo
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/">Ir para o início</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
