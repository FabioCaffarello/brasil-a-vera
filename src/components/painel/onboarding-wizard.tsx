'use client'

// Wizard de onboarding — Wave 10 Etapa 3.
//
// Modal full-screen disparado em /painel quando `onboarded_at IS NULL`.
// 3 passos com botão "Pular":
//   1. UF — Select de 27 UFs
//   2. Temas — 8 chips multi-select
//   3. Tipos de movimentação — 5 chips correspondendo aos topic_* da
//      alert_policy. Mínimo 1 obrigatório se NÃO pulou.
//
// Após qualquer término (concluído ou pulado em todos): POST
// /api/painel/onboarding → server seta onboarded_at = now() + redirect
// para /parlamentares?uf=<UF> (ou /parlamentares se sem UF).
//
// UI minimalista — `<Dialog>` do design system, `<select>` HTML para UF
// (27 opções não justificam Combobox), `<button>` toggle para chips
// (sem peer dep nova).

import { Button } from '@fabio.caffarello/react-design-system/server'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/design-system/primitives/rds-dialog'
import { cn } from '@/lib/cn'
import { TEMAS, type TemaId } from '@/lib/constants/temas'
import { UFS, type Uf } from '@/lib/municipios'

interface TopicSelection {
  topicVotacoes: boolean
  topicGastos: boolean
  topicProposicoes: boolean
  topicDiscursos: boolean
  topicDivergencias: boolean
}

interface TopicOption {
  key: keyof TopicSelection
  label: string
  description: string
}

const TOPIC_OPTIONS: TopicOption[] = [
  {
    key: 'topicVotacoes',
    label: 'Votações',
    description: 'Como cada parlamentar acompanhado votou na semana',
  },
  {
    key: 'topicGastos',
    label: 'Gastos',
    description: 'Despesas relevantes ou com anomalia estatística',
  },
  {
    key: 'topicProposicoes',
    label: 'Proposições',
    description: 'Projetos apresentados e tramitação dos marcados',
  },
  {
    key: 'topicDiscursos',
    label: 'Discursos',
    description: 'Fala em plenário com palavras-chave dos temas',
  },
  {
    key: 'topicDivergencias',
    label: 'Divergências',
    description: 'Votos contrários à orientação da bancada',
  },
]

const EMPTY_TOPICS: TopicSelection = {
  topicVotacoes: false,
  topicGastos: false,
  topicProposicoes: false,
  topicDiscursos: false,
  topicDivergencias: false,
}

export function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [uf, setUf] = useState<Uf | null>(null)
  const [themes, setThemes] = useState<TemaId[]>([])
  const [topics, setTopics] = useState<TopicSelection>(EMPTY_TOPICS)
  const [topicsChosen, setTopicsChosen] = useState(false)
  const [pending, startTransition] = useTransition()

  function commit(skipTopics: boolean) {
    startTransition(async () => {
      try {
        const res = await fetch('/api/painel/onboarding', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            uf,
            themes,
            topics: skipTopics ? null : topics,
          }),
        })
        if (!res.ok) {
          toast.error('Não foi possível salvar suas escolhas. Tente novamente.')
          return
        }
        const body = (await res.json()) as { redirectTo: string }
        router.push(body.redirectTo)
        router.refresh()
      } catch {
        toast.error('Sem conexão. Verifique sua internet e tente de novo.')
      }
    })
  }

  function toggleTheme(id: TemaId) {
    setThemes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    )
  }

  function toggleTopic(key: keyof TopicSelection) {
    setTopics((prev) => ({ ...prev, [key]: !prev[key] }))
    setTopicsChosen(true)
  }

  const atLeastOneTopic = Object.values(topics).some(Boolean)
  const canConcludeStep3 = topicsChosen && atLeastOneTopic

  return (
    // open sempre true — modal não fecha por click-fora nem Esc; só
    // termina por "Pular" no último passo ou "Concluir".
    <Dialog open>
      <DialogContent
        className="max-w-xl"
        // Onboarding não-dispensável: sem Esc / click-outside / X. O usuário
        // avança pelos botões do wizard (próximo/pular). Props do RDS Dialog
        // (#221) que substituem os handlers Radix de close.
        closeOnEscape={false}
        closeOnOverlayClick={false}
        showCloseButton={false}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Vamos configurar sua área</DialogTitle>
            <span className="text-fg-tertiary text-xs">Passo {step}/3</span>
          </div>
          <DialogDescription>
            {step === 1 && 'Personalize as recomendações pela sua UF.'}
            {step === 2 && 'Temas que mais te interessam.'}
            {step === 3 && 'O que você quer receber no report semanal.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="py-4">
            <label
              className="font-medium text-fg-primary text-sm"
              htmlFor="onboarding-uf"
            >
              De onde você acompanha a política?
            </label>
            <select
              className="mt-2 block w-full rounded-md border border-line-emphasis bg-surface-canvas px-3 py-2 text-fg-primary text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-focus"
              id="onboarding-uf"
              onChange={(e) => setUf((e.target.value || null) as Uf | null)}
              value={uf ?? ''}
            >
              <option value="">Selecione…</option>
              {UFS.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
        )}

        {step === 2 && (
          <div className="py-4">
            <p className="font-medium text-fg-primary text-sm">
              Quais temas mais te importam?
            </p>
            <p className="mt-1 text-fg-tertiary text-xs">
              Pode escolher quantos quiser. Influencia recomendações e o
              conteúdo do report.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {TEMAS.map((tema) => {
                const selected = themes.includes(tema.id)
                return (
                  <button
                    aria-pressed={selected}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition-colors',
                      selected
                        ? 'border-fg-brand bg-fg-brand/10 text-fg-primary'
                        : 'border-line-default bg-surface-canvas text-fg-tertiary hover:border-line-emphasis hover:text-fg-primary',
                    )}
                    key={tema.id}
                    onClick={() => toggleTheme(tema.id)}
                    type="button"
                  >
                    {tema.label}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="py-4">
            <p className="font-medium text-fg-primary text-sm">
              O que você quer receber no report semanal?
            </p>
            <p className="mt-1 text-fg-tertiary text-xs">
              Pelo menos uma opção, se quiser configurar agora. Sempre dá pra
              ajustar depois em Configurações.
            </p>
            <ul className="mt-3 space-y-2">
              {TOPIC_OPTIONS.map((opt) => {
                const selected = topics[opt.key]
                return (
                  <li key={opt.key}>
                    <button
                      aria-pressed={selected}
                      className={cn(
                        'w-full rounded-md border px-3 py-2 text-left transition-colors',
                        selected
                          ? 'border-fg-brand bg-fg-brand/10'
                          : 'border-line-default bg-surface-canvas hover:border-line-emphasis',
                      )}
                      onClick={() => toggleTopic(opt.key)}
                      type="button"
                    >
                      <span className="block font-medium text-fg-primary text-sm">
                        {opt.label}
                      </span>
                      <span className="mt-0.5 block text-fg-tertiary text-xs">
                        {opt.description}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {topicsChosen && !atLeastOneTopic && (
              <p className="mt-2 text-fg-error text-xs">
                Selecione pelo menos uma opção ou clique em "Pular".
              </p>
            )}
          </div>
        )}

        <footer className="mt-2 flex items-center justify-between border-line-emphasis border-t pt-4">
          {step < 3 ? (
            <Button
              disabled={pending}
              onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
              type="button"
              variant="ghost"
            >
              Pular
            </Button>
          ) : (
            <Button
              disabled={pending}
              onClick={() => commit(true)}
              type="button"
              variant="ghost"
            >
              Pular tudo
            </Button>
          )}

          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button
                disabled={pending}
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                type="button"
                variant="outline"
              >
                Voltar
              </Button>
            )}
            {step < 3 ? (
              <Button
                disabled={pending}
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                type="button"
              >
                Próximo
              </Button>
            ) : (
              <Button
                disabled={pending || !canConcludeStep3}
                onClick={() => commit(false)}
                type="button"
              >
                Concluir
              </Button>
            )}
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  )
}
