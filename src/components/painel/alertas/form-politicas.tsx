'use client'

// Form Políticas — Wave 10 Etapa 6.
//
// Form completo de gerenciamento da alert_policy:
//   - cadence (radio): weekly / biweekly / monthly
//   - canais (checkboxes): email + inapp
//   - topics (5 checkboxes): votacoes/gastos/proposicoes/discursos/divergencias
//   - boosts (3 checkboxes): eleicoes/cpis/proposicoes_marcadas
//
// Save POST /api/painel/alertas/policy com replace inteiro do state.
// Defaults vêm do server (DEFAULT_ALERT_POLICY se ainda não persistido).

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/design-system/primitives/button'
import { cn } from '@/lib/cn'
import type { AlertPolicyFields } from '@/lib/constants/alert-policy'

interface Props {
  initial: AlertPolicyFields
}

const CADENCE_OPTIONS: {
  value: AlertPolicyFields['cadence']
  label: string
  desc: string
}[] = [
  {
    value: 'weekly',
    label: 'Semanal',
    desc: 'Toda semana, um report consolidado',
  },
  {
    value: 'biweekly',
    label: 'Quinzenal',
    desc: 'A cada duas semanas',
  },
  {
    value: 'monthly',
    label: 'Mensal',
    desc: 'Resumo do mês inteiro em uma só entrega',
  },
]

const TOPIC_OPTIONS: {
  key: keyof Pick<
    AlertPolicyFields,
    | 'topicVotacoes'
    | 'topicGastos'
    | 'topicProposicoes'
    | 'topicDiscursos'
    | 'topicDivergencias'
  >
  label: string
  desc: string
}[] = [
  {
    key: 'topicVotacoes',
    label: 'Votações',
    desc: 'Como cada parlamentar acompanhado votou',
  },
  {
    key: 'topicGastos',
    label: 'Gastos',
    desc: 'Despesas relevantes ou com anomalia estatística',
  },
  {
    key: 'topicProposicoes',
    label: 'Proposições',
    desc: 'Projetos apresentados e tramitação dos marcados',
  },
  {
    key: 'topicDiscursos',
    label: 'Discursos',
    desc: 'Fala em plenário com palavras-chave dos temas',
  },
  {
    key: 'topicDivergencias',
    label: 'Divergências',
    desc: 'Votos contrários à orientação da bancada',
  },
]

const BOOST_OPTIONS: {
  key: keyof Pick<
    AlertPolicyFields,
    'boostEleicoes' | 'boostCpis' | 'boostProposicoesMarcadas'
  >
  label: string
  desc: string
}[] = [
  {
    key: 'boostEleicoes',
    label: 'Períodos eleitorais',
    desc: 'Frequência aumentada em janelas eleitorais ativas',
  },
  {
    key: 'boostCpis',
    label: 'CPIs com membros acompanhados',
    desc: 'Reports extra quando um acompanhado entra em CPI',
  },
  {
    key: 'boostProposicoesMarcadas',
    label: 'Proposições marcadas avançando',
    desc: 'Aviso quando uma proposição que você marcou muda de fase',
  },
]

export function FormPoliticas({ initial }: Props) {
  const router = useRouter()
  const [policy, setPolicy] = useState<AlertPolicyFields>(initial)
  const [pending, startTransition] = useTransition()

  const dirty = !shallowEqual(policy, initial)

  function setField<K extends keyof AlertPolicyFields>(
    key: K,
    value: AlertPolicyFields[K],
  ) {
    setPolicy((prev) => ({ ...prev, [key]: value }))
  }

  function submit() {
    if (!dirty) return
    startTransition(async () => {
      try {
        const res = await fetch('/api/painel/alertas/policy', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(policy),
        })
        if (!res.ok) {
          toast.error('Não foi possível salvar a política. Tente novamente.')
          return
        }
        toast.success('Política de alertas atualizada.')
        router.refresh()
      } catch {
        toast.error('Sem conexão. Tente de novo em instantes.')
      }
    })
  }

  return (
    <form
      className="space-y-10"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <section>
        <h2 className="font-medium text-fg-primary text-lg">Frequência</h2>
        <p className="mt-1 text-fg-tertiary text-sm">
          Quando o report consolidado é enviado.
        </p>
        <div className="mt-3 space-y-2">
          {CADENCE_OPTIONS.map((opt) => {
            const selected = policy.cadence === opt.value
            return (
              <label
                className={cn(
                  'flex items-start gap-3 rounded-md border p-3 transition-colors cursor-pointer',
                  selected
                    ? 'border-fg-brand bg-fg-brand/10'
                    : 'border-line-default bg-surface-base hover:border-line-emphasis',
                )}
                htmlFor={`cadence-${opt.value}`}
                key={opt.value}
              >
                <input
                  checked={selected}
                  className="mt-0.5 size-4 accent-brand"
                  disabled={pending}
                  id={`cadence-${opt.value}`}
                  name="cadence"
                  onChange={() => setField('cadence', opt.value)}
                  type="radio"
                  value={opt.value}
                />
                <div className="flex-1">
                  <p className="font-medium text-fg-primary text-sm">
                    {opt.label}
                  </p>
                  <p className="text-fg-tertiary text-xs">{opt.desc}</p>
                </div>
              </label>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="font-medium text-fg-primary text-lg">Canais</h2>
        <p className="mt-1 text-fg-tertiary text-sm">
          Onde você quer receber o report.
        </p>
        <div className="mt-3 space-y-2">
          <CheckboxRow
            checked={policy.channelEmail}
            description="Enviado pelo Resend para o e-mail do seu cadastro"
            disabled={pending}
            id="channel-email"
            label="E-mail"
            onChange={(v) => setField('channelEmail', v)}
          />
          <CheckboxRow
            checked={policy.channelInapp}
            description="Listado na sub-tab Recebidos aqui no painel"
            disabled={pending}
            id="channel-inapp"
            label="Caixa de entrada no painel"
            onChange={(v) => setField('channelInapp', v)}
          />
        </div>
      </section>

      <section>
        <h2 className="font-medium text-fg-primary text-lg">Conteúdo</h2>
        <p className="mt-1 text-fg-tertiary text-sm">
          O que entra em cada report.
        </p>
        <div className="mt-3 space-y-2">
          {TOPIC_OPTIONS.map((opt) => (
            <CheckboxRow
              checked={policy[opt.key]}
              description={opt.desc}
              disabled={pending}
              id={`topic-${opt.key}`}
              key={opt.key}
              label={opt.label}
              onChange={(v) => setField(opt.key, v)}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-medium text-fg-primary text-lg">
          Períodos especiais
        </h2>
        <p className="mt-1 text-fg-tertiary text-sm">
          Aumentam a frequência além do ciclo regular em janelas relevantes.
        </p>
        <div className="mt-3 space-y-2">
          {BOOST_OPTIONS.map((opt) => (
            <CheckboxRow
              checked={policy[opt.key]}
              description={opt.desc}
              disabled={pending}
              id={`boost-${opt.key}`}
              key={opt.key}
              label={opt.label}
              onChange={(v) => setField(opt.key, v)}
            />
          ))}
        </div>
      </section>

      <div className="pt-2">
        <Button disabled={pending || !dirty} type="submit">
          Salvar política
        </Button>
      </div>
    </form>
  )
}

function CheckboxRow({
  id,
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string
  label: string
  description: string
  checked: boolean
  disabled: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label
      className="flex items-start gap-3 rounded-md border border-line-default bg-surface-base p-3"
      htmlFor={id}
    >
      <input
        checked={checked}
        className="mt-0.5 size-4 accent-brand"
        disabled={disabled}
        id={id}
        onChange={(e) => onChange(e.target.checked)}
        type="checkbox"
      />
      <div className="flex-1">
        <p className="font-medium text-fg-primary text-sm">{label}</p>
        <p className="text-fg-tertiary text-xs">{description}</p>
      </div>
    </label>
  )
}

function shallowEqual(a: AlertPolicyFields, b: AlertPolicyFields): boolean {
  return (
    a.cadence === b.cadence &&
    a.channelEmail === b.channelEmail &&
    a.channelInapp === b.channelInapp &&
    a.topicVotacoes === b.topicVotacoes &&
    a.topicGastos === b.topicGastos &&
    a.topicProposicoes === b.topicProposicoes &&
    a.topicDiscursos === b.topicDiscursos &&
    a.topicDivergencias === b.topicDivergencias &&
    a.boostEleicoes === b.boostEleicoes &&
    a.boostCpis === b.boostCpis &&
    a.boostProposicoesMarcadas === b.boostProposicoesMarcadas
  )
}
