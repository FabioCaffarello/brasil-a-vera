// Helpers de data para ingestão. Toda janela de tempo do legislativo brasileiro
// deve ser calculada no fuso `America/Sao_Paulo` — usar `toISOString()` cru
// gera diferença de até 1 dia próximo à virada UTC.

const SP_DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Formata uma Date como `YYYY-MM-DD` no fuso `America/Sao_Paulo`.
 * Use `compact: true` para `YYYYMMDD` (formato esperado pela API do Senado).
 */
export function formatDateSP(date: Date, compact = false): string {
  const iso = SP_DATE_FMT.format(date) // já vem como YYYY-MM-DD
  return compact ? iso.replace(/-/g, '') : iso
}

/**
 * Janela "últimos N dias" terminando hoje, calculada em horário de Brasília.
 * Retorna `{ dataInicio, dataFim }` ambos `YYYY-MM-DD` (ou compactos).
 */
export function defaultDateRange(
  daysBack: number,
  compact = false,
): { dataInicio: string; dataFim: string } {
  const hoje = new Date()
  const inicio = new Date(hoje)
  inicio.setDate(inicio.getDate() - daysBack)
  return {
    dataInicio: formatDateSP(inicio, compact),
    dataFim: formatDateSP(hoje, compact),
  }
}
