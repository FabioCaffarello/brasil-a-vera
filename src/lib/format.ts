// Helpers de formatação BR — strings prontas para renderização.
// Pure, testáveis sem ambiente Next/React.

const FORMATADOR_BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

// Datas sem hora vêm de campos `date` (YYYY-MM-DD) ou ISO sem timezone.
// Forçamos UTC para evitar deslocamento de 1 dia em fusos negativos como o
// de Brasília (-03:00).
const FORMATADOR_DATA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
})

const FORMATADOR_DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

// Aceita string vinda do Drizzle (numeric `mode: 'string'`) ou número.
export function formatBRL(value: string | number | null | undefined): string {
  if (value == null) return '—'
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return '—'
  return FORMATADOR_BRL.format(n)
}

export function formatDataBR(value: Date | string | null | undefined): string {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return FORMATADOR_DATA.format(d)
}

export function formatDataHoraBR(
  value: Date | string | null | undefined,
): string {
  if (!value) return '—'
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return FORMATADOR_DATA_HORA.format(d)
}

// "PL 1234/2025" — formatação canônica de proposição.
export function formatProposicaoRef(
  tipo: string,
  numero: number,
  ano: number,
): string {
  return `${tipo} ${numero}/${ano}`
}

// Labels e cores para o enum `tipo_voto`. Centralizado para reuso entre
// VotosRecentes (perfil parlamentar), PaginaVotacao e Pares Contraditórios.
//
// Sprint 4.2 PR 5 — migrado para tokens semânticos OKLCH:
// - SIM   → success (outcome positivo)
// - NÃO   → destructive (outcome negativo)
// - ABSTENCAO → warning (deliberate non-vote, intermediário)
// - AUSENTE → surface-elevated + foreground-muted (não se manifestou)
// - OBSTRUCAO → brand/20 + brand (manobra procedural distinta — merece
//   destaque visual sem cair em success/destructive/warning)
const TIPO_VOTO_LABELS: Record<string, { label: string; classes: string }> = {
  SIM: {
    label: 'SIM',
    classes: 'bg-success/20 text-fg-success',
  },
  NAO: {
    label: 'NÃO',
    classes: 'bg-error/20 text-fg-error',
  },
  ABSTENCAO: {
    label: 'Abstenção',
    classes: 'bg-warning/20 text-fg-warning',
  },
  AUSENTE: {
    label: 'Ausente',
    classes: 'bg-surface-raised text-fg-tertiary',
  },
  OBSTRUCAO: {
    label: 'Obstrução',
    classes: 'bg-fg-brand/20 text-fg-brand',
  },
}

export function getTipoVotoStyle(tipo: string): {
  label: string
  classes: string
} {
  return (
    TIPO_VOTO_LABELS[tipo] ?? {
      label: tipo,
      classes: 'bg-surface-raised text-fg-tertiary',
    }
  )
}
