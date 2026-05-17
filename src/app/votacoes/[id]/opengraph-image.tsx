import { ImageResponse } from 'next/og'

import { formatDataBR } from '@/lib/format'
import {
  BrandFooter,
  fallbackOg,
  OG_CONTENT_TYPE,
  OG_SIZE,
  truncate,
} from '@/lib/og/chrome'
import { getVotacaoById } from '@/lib/queries/votacoes'

export const alt = 'Votação nominal — Brasil à Vera, transparência política'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

interface Props {
  params: Promise<{ id: string }>
}

export default async function OgVotacao({ params }: Props) {
  const { id } = await params
  const v = await getVotacaoById(id)
  if (!v) return fallbackOg('Votação não encontrada')

  const resultado =
    v.aprovada === true
      ? { label: 'Aprovada', bg: '#d1fae5', fg: '#065f46' }
      : v.aprovada === false
        ? { label: 'Rejeitada', bg: '#fee2e2', fg: '#991b1b' }
        : { label: 'Sem resultado registrado', bg: '#e4e4e7', fg: '#3f3f46' }

  const casaLabel = v.casa === 'CAMARA' ? 'Câmara' : 'Senado'

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
          padding: '64px 80px',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              fontSize: '22px',
              color: '#71717a',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '24px',
            }}
          >
            <span>Votação · {casaLabel}</span>
            <span style={{ color: '#a1a1aa' }}>·</span>
            <span style={{ fontFamily: 'monospace' }}>
              {formatDataBR(v.dataHora)}
            </span>
          </div>
          <div
            style={{
              fontSize: '40px',
              color: '#18181b',
              lineHeight: 1.25,
              fontWeight: 600,
            }}
          >
            {truncate(v.descricao, 180)}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', gap: '40px' }}>
            <Tally label="SIM" value={v.votosSim} color="#059669" />
            <Tally label="NÃO" value={v.votosNao} color="#dc2626" />
            <Tally label="Abst." value={v.abstencoes} color="#d97706" />
          </div>
          <span
            style={{
              display: 'flex',
              padding: '12px 28px',
              borderRadius: '999px',
              backgroundColor: resultado.bg,
              color: resultado.fg,
              fontSize: '26px',
              fontWeight: 700,
            }}
          >
            {resultado.label}
          </span>
        </div>
      </div>
      <BrandFooter />
    </div>,
    size,
  )
}

function Tally({
  label,
  value,
  color,
}: {
  label: string
  value: number | null
  color: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
      }}
    >
      <span
        style={{
          fontSize: '20px',
          color: '#71717a',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '4px',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '72px',
          fontWeight: 700,
          color,
          lineHeight: 1,
          fontFamily: 'monospace',
        }}
      >
        {value ?? 0}
      </span>
    </div>
  )
}
