import { logger } from '../shared/logger'

export type ReconciliationReport = {
  source: string
  startedAt: Date
  finishedAt: Date
  // Contagens agregadas
  officialCount: number // Quantos registros a fonte oficial retornou
  localCount: number // Quantos registros temos no banco (do mesmo escopo)
  // Divergências
  gaps: Array<{ idExterno: string; nome?: string; note?: string }> // na fonte, não no banco
  orphans: Array<{ idExterno: string; nome?: string; note?: string }> // no banco, não na fonte
  stale: Array<{
    idExterno: string
    field: string
    official: string
    local: string
  }> // valores divergentes
  // Resumo final
  divergenceCount: number // gaps + orphans + stale
  okCount: number
}

export function newReport(source: string): ReconciliationReport {
  return {
    source,
    startedAt: new Date(),
    finishedAt: new Date(),
    officialCount: 0,
    localCount: 0,
    gaps: [],
    orphans: [],
    stale: [],
    divergenceCount: 0,
    okCount: 0,
  }
}

export function finalizeReport(report: ReconciliationReport): void {
  report.finishedAt = new Date()
  report.divergenceCount =
    report.gaps.length + report.orphans.length + report.stale.length
  report.okCount = Math.max(
    0,
    Math.min(report.officialCount, report.localCount) - report.stale.length,
  )
}

export function printReport(report: ReconciliationReport): void {
  const durationMs = report.finishedAt.getTime() - report.startedAt.getTime()

  // Log estruturado (consistente com outros scripts)
  logger.info('Reconciliação concluída', {
    source: report.source,
    durationMs,
    officialCount: report.officialCount,
    localCount: report.localCount,
    divergenceCount: report.divergenceCount,
    gaps: report.gaps.length,
    orphans: report.orphans.length,
    stale: report.stale.length,
    okCount: report.okCount,
  })

  // Resumo legível em stdout (complementar ao log JSON).
  // Usamos process.stdout.write para não gerar mais uma linha JSON via logger.
  const lines: string[] = []
  lines.push('')
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push(`  RECONCILIAÇÃO: ${report.source}`)
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push(`  Registros na fonte oficial: ${report.officialCount}`)
  lines.push(`  Registros no banco local:   ${report.localCount}`)
  lines.push(`  Divergências totais:        ${report.divergenceCount}`)
  lines.push('')
  lines.push(`  Gaps    (na fonte, fora do banco):  ${report.gaps.length}`)
  lines.push(`  Orphans (no banco, fora da fonte):  ${report.orphans.length}`)
  lines.push(`  Stale   (valores divergentes):      ${report.stale.length}`)
  lines.push('')

  if (report.gaps.length > 0) {
    lines.push('  GAPS (primeiros 10):')
    for (const g of report.gaps.slice(0, 10)) {
      lines.push(
        `    - ${g.idExterno}${g.nome ? ` (${g.nome})` : ''}${g.note ? ` — ${g.note}` : ''}`,
      )
    }
    lines.push('')
  }
  if (report.orphans.length > 0) {
    lines.push('  ORPHANS (primeiros 10):')
    for (const o of report.orphans.slice(0, 10)) {
      lines.push(
        `    - ${o.idExterno}${o.nome ? ` (${o.nome})` : ''}${o.note ? ` — ${o.note}` : ''}`,
      )
    }
    lines.push('')
  }
  if (report.stale.length > 0) {
    lines.push('  STALE (primeiros 10):')
    for (const s of report.stale.slice(0, 10)) {
      lines.push(
        `    - ${s.idExterno} · ${s.field}: local="${s.local}" → oficial="${s.official}"`,
      )
    }
    lines.push('')
  }

  if (report.divergenceCount > 0) {
    lines.push('  SUGESTÃO DE CORREÇÃO:')
    if (report.gaps.length > 0) {
      lines.push(
        '    • Gaps: execute o sync apropriado para preencher dados faltantes',
      )
      lines.push(
        '      Exemplo: npm run ingest:votacoes:camara -- --desde=<YYYY-MM-DD>',
      )
    }
    if (report.stale.length > 0) {
      lines.push(
        '    • Stale: execute o sync para sobrescrever com valores oficiais atuais',
      )
    }
    if (report.orphans.length > 0) {
      lines.push(
        '    • Orphans: registros locais que saíram da fonte oficial — investigar manualmente',
      )
    }
    lines.push('')
  }

  const exitCode = report.divergenceCount === 0 ? 0 : 1
  lines.push(
    `  Resultado: ${exitCode === 0 ? '✓ SEM DIVERGÊNCIAS' : '✗ DIVERGÊNCIAS DETECTADAS (exit code 1)'}`,
  )
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('')

  process.stdout.write(lines.join('\n'))
}
