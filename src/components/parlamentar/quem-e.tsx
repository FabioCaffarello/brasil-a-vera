// Perfil biográfico do parlamentar (ADR-049). Server component.
//
// Mostra profissão, escolaridade, idade e naturalidade — contexto de "quem é".
// Copy honesta (D4): dados AUTODECLARADOS no registro, não verificados,
// point-in-time. A idade é derivada da data de nascimento no render.

import { calcularIdade } from '@/modules/parlamentares/domain/idade'

interface Props {
  escolaridade: string | null
  dataNascimento: string | null
  municipioNascimento: string | null
  ufNascimento: string | null
  profissao: string | null
}

export function QuemE(props: Props) {
  const idade = props.dataNascimento
    ? calcularIdade(props.dataNascimento, new Date())
    : null
  const naturalidade = [props.municipioNascimento, props.ufNascimento?.trim()]
    .filter(Boolean)
    .join(' — ')

  const items: Array<{ label: string; value: string }> = []
  if (props.profissao)
    items.push({ label: 'Profissão', value: props.profissao })
  if (props.escolaridade)
    items.push({ label: 'Escolaridade', value: props.escolaridade })
  if (idade !== null) items.push({ label: 'Idade', value: `${idade} anos` })
  if (naturalidade) items.push({ label: 'Naturalidade', value: naturalidade })

  if (items.length === 0) {
    return (
      <p className="text-fg-tertiary text-sm">
        Sem dados biográficos ingeridos para este parlamentar.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {items.map((it) => (
          <div key={it.label}>
            <dt className="text-fg-tertiary text-xs uppercase tracking-wide">
              {it.label}
            </dt>
            <dd className="mt-0.5 text-fg-primary text-sm">{it.value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-fg-tertiary text-xs">
        Dados <strong>autodeclarados</strong> pelo parlamentar no registro
        oficial — não verificados de forma independente e podem estar
        desatualizados.
      </p>
    </div>
  )
}
