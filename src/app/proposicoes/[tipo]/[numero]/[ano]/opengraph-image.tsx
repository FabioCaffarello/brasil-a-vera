import { ImageResponse } from 'next/og'

import { formatProposicaoRef } from '@/lib/format'
import {
  BrandFooter,
  fallbackOg,
  OG_CONTENT_TYPE,
  OG_SIZE,
  truncate,
} from '@/lib/og/chrome'
import {
  getProposicaoByChave,
  TIPOS_PROPOSICAO,
  type TipoProposicao,
} from '@/lib/queries/proposicoes'

export const alt = 'Proposição — Brasil à Vera, transparência política'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

interface Props {
  params: Promise<{ tipo: string; numero: string; ano: string }>
}

const SITUACAO_LABELS: Record<
  string,
  { label: string; bg: string; fg: string }
> = {
  TRAMITANDO: { label: 'Em tramitação', bg: '#fef3c7', fg: '#92400e' },
  APROVADA: { label: 'Aprovada', bg: '#d1fae5', fg: '#065f46' },
  REJEITADA: { label: 'Rejeitada', bg: '#fee2e2', fg: '#991b1b' },
  ARQUIVADA: { label: 'Arquivada', bg: '#e4e4e7', fg: '#3f3f46' },
  TRANSFORMADA_EM_NORMA: {
    label: 'Transformada em norma',
    bg: '#d1fae5',
    fg: '#065f46',
  },
}

export default async function OgProposicao({ params }: Props) {
  const raw = await params
  const tipo = raw.tipo.toUpperCase() as TipoProposicao
  const numero = Number(raw.numero)
  const ano = Number(raw.ano)

  if (
    !TIPOS_PROPOSICAO.includes(tipo) ||
    !Number.isInteger(numero) ||
    !Number.isInteger(ano)
  ) {
    return fallbackOg('Proposição inválida')
  }

  const p = await getProposicaoByChave(tipo, numero, ano)
  if (!p) return fallbackOg('Proposição não encontrada')

  const ref = formatProposicaoRef(p.tipo, p.numero, p.ano)
  const situacao = SITUACAO_LABELS[p.situacao] ?? {
    label: p.situacao,
    bg: '#e4e4e7',
    fg: '#3f3f46',
  }

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fafafa',
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          flex: 1,
          padding: '72px 80px',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: '24px',
              color: '#71717a',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '16px',
            }}
          >
            Proposição
          </div>
          <div
            style={{
              fontSize: '88px',
              fontWeight: 700,
              fontFamily: 'monospace',
              color: '#059669',
              lineHeight: 1,
              marginBottom: '36px',
            }}
          >
            {ref}
          </div>
          <div
            style={{
              fontSize: '32px',
              color: '#18181b',
              lineHeight: 1.35,
              fontWeight: 500,
            }}
          >
            {truncate(p.ementa, 240)}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <span
            style={{
              display: 'flex',
              padding: '10px 24px',
              borderRadius: '999px',
              backgroundColor: situacao.bg,
              color: situacao.fg,
              fontSize: '22px',
              fontWeight: 600,
            }}
          >
            {situacao.label}
          </span>
        </div>
      </div>
      <BrandFooter />
    </div>,
    size,
  )
}
