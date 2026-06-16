'use client'

// Toggles de comunicação — Wave 10 Etapa 5.
//
// 2 checkboxes opt-in (default false — LGPD art. 7º I exige consent
// expresso). POST /api/painel/profile/comunicacao registra a mudança
// em consent_log (audit trail ADR-031).
//
// Separado dos `topic_*` da alert_policy: aqueles são alertas DE
// SERVIÇO (sempre ligados quando há follows). Isto é comunicação FORA
// do serviço — releases, surveys, novidades do projeto.

import { Button } from '@fabio.caffarello/react-design-system/server'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

interface Props {
  initialMarketingOptedIn: boolean
  initialSurveyOptedIn: boolean
}

export function ComunicacaoToggles({
  initialMarketingOptedIn,
  initialSurveyOptedIn,
}: Props) {
  const router = useRouter()
  const [marketingOptedIn, setMarketing] = useState(initialMarketingOptedIn)
  const [surveyOptedIn, setSurvey] = useState(initialSurveyOptedIn)
  const [pending, startTransition] = useTransition()

  const dirty =
    marketingOptedIn !== initialMarketingOptedIn ||
    surveyOptedIn !== initialSurveyOptedIn

  function submit() {
    if (!dirty) return
    startTransition(async () => {
      try {
        const res = await fetch('/api/painel/profile/comunicacao', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ marketingOptedIn, surveyOptedIn }),
        })
        if (!res.ok) {
          toast.error('Não foi possível salvar. Tente novamente.')
          return
        }
        toast.success('Preferências atualizadas.')
        router.refresh()
      } catch {
        toast.error('Sem conexão. Tente de novo em instantes.')
      }
    })
  }

  return (
    <div className="space-y-3">
      <label
        className="flex items-start gap-3 rounded-md border border-line-default bg-surface-base p-3"
        htmlFor="comunicacao-marketing"
      >
        <input
          checked={marketingOptedIn}
          className="mt-0.5 size-4 accent-brand"
          disabled={pending}
          id="comunicacao-marketing"
          onChange={(e) => setMarketing(e.target.checked)}
          type="checkbox"
        />
        <div className="flex-1">
          <p className="font-medium text-fg-primary text-sm">
            Comunicações esporádicas do projeto
          </p>
          <p className="text-fg-tertiary text-xs">
            Releases, novidades e mudanças relevantes do Brasil à Vera. Sem
            promoção comercial.
          </p>
        </div>
      </label>

      <label
        className="flex items-start gap-3 rounded-md border border-line-default bg-surface-base p-3"
        htmlFor="comunicacao-survey"
      >
        <input
          checked={surveyOptedIn}
          className="mt-0.5 size-4 accent-brand"
          disabled={pending}
          id="comunicacao-survey"
          onChange={(e) => setSurvey(e.target.checked)}
          type="checkbox"
        />
        <div className="flex-1">
          <p className="font-medium text-fg-primary text-sm">
            Convite para survey ocasional
          </p>
          <p className="text-fg-tertiary text-xs">
            Pesquisas curtas para entender necessidades dos cidadãos usuários.
            Sempre opcionais.
          </p>
        </div>
      </label>

      <Button disabled={pending || !dirty} onClick={submit} type="button">
        Salvar preferências
      </Button>
    </div>
  )
}
