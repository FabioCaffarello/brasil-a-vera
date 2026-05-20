import { ImageResponse } from 'next/og'

import {
  BrandFooter,
  fallbackOg,
  OG_CONTENT_TYPE,
  OG_SIZE,
  truncate,
} from '@/lib/og/chrome'
import { getPartidoOverview } from '@/lib/queries/partidos'

export const alt = 'Partido — Brasil à Vera, transparência política'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

interface Props {
  params: Promise<{ sigla: string }>
}

export default async function OgPartido({ params }: Props) {
  const { sigla } = await params
  const decoded = decodeURIComponent(sigla).toUpperCase()
  const overview = await getPartidoOverview(decoded)
  if (overview.totalParlamentares === 0) {
    return fallbackOg(`Partido ${decoded} sem registros`)
  }

  const camara = overview.parlamentares.filter(
    (p) => p.casa === 'CAMARA',
  ).length
  const senado = overview.parlamentares.filter(
    (p) => p.casa === 'SENADO',
  ).length

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
              fontSize: '22px',
              color: '#71717a',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '24px',
            }}
          >
            Partido político
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '120px',
              fontWeight: 700,
              color: '#18181b',
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            {decoded}
          </div>
          {overview.nomeOficial && overview.nomeOficial !== decoded && (
            <div
              style={{
                display: 'flex',
                fontSize: '32px',
                color: '#52525b',
                marginTop: '24px',
                lineHeight: 1.25,
              }}
            >
              {truncate(overview.nomeOficial, 100)}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '64px' }}>
          <Stat label="Total" value={overview.totalParlamentares} />
          {camara > 0 && <Stat label="Câmara" value={camara} />}
          {senado > 0 && <Stat label="Senado" value={senado} />}
        </div>
      </div>
      <BrandFooter />
    </div>,
    size,
  )
}

function Stat({ label, value }: { label: string; value: number }) {
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
          color: '#18181b',
          lineHeight: 1,
          fontFamily: 'monospace',
        }}
      >
        {value}
      </span>
    </div>
  )
}
