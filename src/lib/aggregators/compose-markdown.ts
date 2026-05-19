// Composer puro de markdown do report semanal — Wave 10 Etapa 7.2.
//
// Função pura: recebe `Aggregate` + metadados e retorna o body_md
// que será gravado em alert_delivery e (na Etapa 7.3) enviado pelo
// Resend.
//
// Sem dependência de db ou outras camadas — facilita unit test.

import type {
  Aggregate,
  DivergenciaItem,
  GastoItem,
  ProposicaoItem,
  VotacaoItem,
} from './types'

export interface ComposeMeta {
  periodStart: Date
  periodEnd: Date
  followsCount: number
  /** Nome do usuário (display_name) — `null` se ainda não preenchido. */
  displayName: string | null
}

// Caps de itens por bloco no email. Sem hard cap (VISION §6 — "tamanho
// do email gerenciado pelo template"), mas evita explosão se houver
// 50 votações na semana.
const TOP_VOTACOES = 5
const TOP_DIVERGENCIAS = 5
const TOP_PROPOSICOES = 5
const TOP_GASTOS = 5

export function composeReportMarkdown(
  agg: Aggregate,
  meta: ComposeMeta,
): string {
  const sections: string[] = []

  sections.push(composeHeader(meta))
  sections.push(composeKpiStrip(agg, meta))

  if (agg.votacoes && agg.votacoes.length > 0) {
    sections.push(composeVotacoes(agg.votacoes))
  }
  if (agg.divergencias && agg.divergencias.length > 0) {
    sections.push(composeDivergencias(agg.divergencias))
  }
  if (agg.proposicoes && agg.proposicoes.length > 0) {
    sections.push(composeProposicoes(agg.proposicoes))
  }
  if (agg.gastos && agg.gastos.length > 0) {
    sections.push(composeGastos(agg.gastos))
  }

  sections.push(composeFooter())

  return sections.join('\n\n')
}

// ─────────────────────────────────────────────────────────────────────────

function composeHeader(meta: ComposeMeta): string {
  const periodLabel = formatPeriodLabel(meta.periodStart, meta.periodEnd)
  const greeting = meta.displayName ? `Olá, ${meta.displayName}.` : 'Olá.'
  return [
    `# Brasil à Vera · Resumo ${periodLabel}`,
    '',
    greeting,
    '',
    `Você acompanha ${meta.followsCount} ${
      meta.followsCount === 1 ? 'parlamentar' : 'parlamentares'
    }.`,
  ].join('\n')
}

function composeKpiStrip(agg: Aggregate, _meta: ComposeMeta): string {
  const nVotacoes = agg.votacoes?.length ?? 0
  const nDivergencias = agg.divergencias?.length ?? 0
  const nProposicoes = agg.proposicoes?.length ?? 0
  const totalGasto = (agg.gastos ?? []).reduce(
    (sum, g) => sum + Number(g.valor || 0),
    0,
  )

  const parts = [
    `${nVotacoes} ${nVotacoes === 1 ? 'votação' : 'votações'}`,
    `${nProposicoes} ${nProposicoes === 1 ? 'proposição' : 'proposições'}`,
    formatBRL(totalGasto),
    `${nDivergencias} ${nDivergencias === 1 ? 'divergência' : 'divergências'}`,
  ]

  return `**No período:** ${parts.join(' · ')}`
}

function composeVotacoes(items: VotacaoItem[]): string {
  const top = items.slice(0, TOP_VOTACOES)
  const lines: string[] = ['## Votações']
  for (const v of top) {
    const data = formatDate(v.dataHora)
    const placar = `${v.votosSim} × ${v.votosNao}`
    const resultado = v.aprovada ? '✓ Aprovada' : '✗ Rejeitada'
    lines.push('')
    lines.push(`**${v.descricao}** · ${v.casa} · ${data}`)
    lines.push(`Placar ${placar} · ${resultado}`)
    for (const p of v.porParlamentar) {
      lines.push(
        `- ${p.parlamentarNome} (${p.partidoSigla}): **${normalizeVoto(p.voto)}**`,
      )
    }
  }
  if (items.length > top.length) {
    lines.push('')
    lines.push(`_+ ${items.length - top.length} outras votações no período._`)
  }
  return lines.join('\n')
}

function composeDivergencias(items: DivergenciaItem[]): string {
  const top = items.slice(0, TOP_DIVERGENCIAS)
  const lines: string[] = ['## Divergências da bancada']
  for (const d of top) {
    const data = formatDate(d.votacaoDataHora)
    lines.push('')
    lines.push(
      `- **${d.parlamentarNome}** (${d.partidoSigla}) votou **${normalizeVoto(
        d.votoIndividual,
      )}**, contra a orientação **${normalizeVoto(d.orientacaoBancada)}** — em "${
        d.votacaoDescricao
      }" (${data})`,
    )
  }
  if (items.length > top.length) {
    lines.push('')
    lines.push(`_+ ${items.length - top.length} outras divergências._`)
  }
  return lines.join('\n')
}

function composeProposicoes(items: ProposicaoItem[]): string {
  const top = items.slice(0, TOP_PROPOSICOES)
  const lines: string[] = ['## Proposições']
  for (const p of top) {
    lines.push('')
    const label = `${p.tipo} ${p.numero}/${p.ano}`
    lines.push(`**${label}** — _autor: ${p.autorNome}_`)
    lines.push(p.ementa)
    if (p.ultimaTramitacaoData && p.ultimaTramitacaoDescricao) {
      const data = formatDate(p.ultimaTramitacaoData)
      lines.push(`- Tramitação ${data}: ${p.ultimaTramitacaoDescricao}`)
    }
  }
  if (items.length > top.length) {
    lines.push('')
    lines.push(`_+ ${items.length - top.length} outras proposições._`)
  }
  return lines.join('\n')
}

function composeGastos(items: GastoItem[]): string {
  const top = items.slice(0, TOP_GASTOS)
  const lines: string[] = ['## Gastos']
  for (const g of top) {
    const data = formatDate(g.dataEmissao)
    const valor = formatBRL(Number(g.valor || 0))
    lines.push('')
    lines.push(
      `- **${g.parlamentarNome}** · ${valor} · ${g.categoriaDescricao} · _${g.fornecedorNome}_ · ${data}`,
    )
  }
  if (items.length > top.length) {
    lines.push('')
    lines.push(`_+ ${items.length - top.length} outros gastos no período._`)
  }
  return lines.join('\n')
}

function composeFooter(): string {
  return [
    '---',
    '',
    'Você está recebendo este resumo porque optou por acompanhar parlamentares no [Brasil à Vera](https://brasilavera.org).',
    '',
    '[Gerenciar alertas](https://brasilavera.org/painel/alertas) · [Configurações](https://brasilavera.org/painel/configuracoes) · [Política de privacidade](https://brasilavera.org/privacidade)',
    '',
    '_Encarregado (DPO): Fabio Caffarello · lgpd@brasilavera.org_',
  ].join('\n')
}

// ── helpers ──────────────────────────────────────────────────────────

function formatPeriodLabel(start: Date, end: Date): string {
  return `${formatDate(start)}–${formatDate(end)}`
}

function formatDate(d: Date): string {
  // DD/MM. UTC para alinhar com o cron (dom 21:00 UTC) — não confunde
  // usuário com tz local do server.
  const day = String(d.getUTCDate()).padStart(2, '0')
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

function formatBRL(value: number): string {
  // pt-BR: R$ 1.234,56
  if (!Number.isFinite(value) || value === 0) return 'R$ 0,00'
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

function normalizeVoto(raw: string): string {
  // Os enums têm valores tipo SIM, NAO, ABSTENCAO. Markdown fica com
  // primeira letra maiúscula só.
  switch (raw) {
    case 'SIM':
      return 'Sim'
    case 'NAO':
      return 'Não'
    case 'ABSTENCAO':
      return 'Abstenção'
    case 'OBSTRUCAO':
      return 'Obstrução'
    case 'AUSENTE':
      return 'Ausente'
    case 'LIBERADO':
      return 'Liberado'
    default:
      return raw
  }
}
