'use client'

import { Button } from '@fabio.caffarello/react-design-system/server'
import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react'
import { useEffect } from 'react'

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Error boundary para /votacoes/[id] — Wave 9 Sprint 9.5 PR2.
 *
 * Client Component (obrigatório para error.tsx em Next 16). Estrutura
 * mínima honesta: ícone de alerta + mensagem amigável + ações.
 *
 * Não vaza error.message em produção (pode conter detalhes técnicos).
 * Mostra digest curto para correlação com logs Workers. reset() tenta
 * re-renderizar a página inteira.
 */
export default function VotacaoError({ error, reset }: Props) {
  useEffect(() => {
    // Loga client-side para Cloudflare/Workers capturar (Wave 9 ainda
    // não tem Sentry — issue futura). JSON estruturado para grep.
    console.error(
      JSON.stringify({
        event: 'votacao_detail_error',
        digest: error.digest,
        message: error.message,
      }),
    )
  }, [error])

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <div className="mb-4 flex justify-center">
          <AlertTriangle aria-hidden className="h-12 w-12 text-destructive" />
        </div>

        <h1 className="mb-2 font-semibold text-2xl text-foreground">
          Não foi possível carregar esta votação
        </h1>

        <p className="mb-6 text-foreground-muted">
          Algo deu errado ao buscar os dados. Pode ser uma interrupção
          temporária na API oficial ou no nosso banco. Tente novamente em alguns
          segundos.
        </p>

        {error.digest ? (
          <p className="mb-6 font-mono text-foreground-subtle text-xs">
            Código do erro: {error.digest}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button onClick={reset} type="button" variant="primary">
            <RotateCcw aria-hidden className="h-4 w-4" />
            Tentar novamente
          </Button>
          <Button asChild variant="outline">
            <a href="/votacoes">
              <ArrowLeft aria-hidden className="h-4 w-4" />
              Voltar para votações
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
