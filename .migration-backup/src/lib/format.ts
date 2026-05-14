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
// VotosRecentes (perfil parlamentar) e PaginaVotacao (futuro).
const TIPO_VOTO_LABELS: Record<string, { label: string; classes: string }> = {
  SIM: {
    label: 'SIM',
    classes:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  },
  NAO: {
    label: 'NÃO',
    classes: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200',
  },
  ABSTENCAO: {
    label: 'Abstenção',
    classes:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  },
  AUSENTE: {
    label: 'Ausente',
    classes: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  },
  OBSTRUCAO: {
    label: 'Obstrução',
    classes:
      'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
  },
}

export function getTipoVotoStyle(tipo: string): {
  label: string
  classes: string
} {
  return (
    TIPO_VOTO_LABELS[tipo] ?? {
      label: tipo,
      classes: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    }
  )
}
