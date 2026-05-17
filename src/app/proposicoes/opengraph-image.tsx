import { ImageResponse } from 'next/og'

import { formatNumeroAbreviado } from '@/lib/format-number'
import { BrandFooter, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og/chrome'
import { getPublicStats } from '@/lib/queries/stats-public'

export const alt =
  'Proposições — Brasil à Vera, projetos de lei, PECs e medidas provisórias em tramitação'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

// Sprint 3.2 Tarefa 1 — OG dinâmico de listagem. Mesma estratégia de cache
// que /parlamentares e /votacoes. force-dynamic por placeholder
// DATABASE_URL no build do CF Workers.
export const dynamic = 'force-dynamic'

const CACHE_HEADERS = {
  'cache-control': 'public, max-age=3600, s-maxage=3600',
}

export default async function OgProposicoesList() {
  const stats = await getPublicStats().catch(() => null)
  const total = stats?.totalProposicoes ?? 0

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
          flexDirection: 'column',
          padding: '64px 80px',
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
              marginBottom: '20px',
            }}
          >
            Brasil à Vera · Listagem
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '108px',
              fontWeight: 700,
              color: '#18181b',
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            Proposições
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '30px',
              color: '#52525b',
              marginTop: '20px',
              lineHeight: 1.3,
            }}
          >
            Projetos de lei, PECs, medidas provisórias e demais proposições em
            tramitação na Câmara e no Senado.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '64px', alignItems: 'flex-end' }}>
          {total > 0 ? (
            <Stat
              label="Total"
              value={formatNumeroAbreviado(total)}
              suffix="proposições"
            />
          ) : null}
          <Stat label="Cobertura" value="56–57" suffix="legislaturas" />
          <Stat label="Tipos" value="PL · PEC · PLP · MPV · PDC · PRC" />
        </div>
      </div>
      <BrandFooter />
    </div>,
    { ...size, headers: CACHE_HEADERS },
  )
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string
  value: string
  suffix?: string
}) {
  const isLong = value.length > 12
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
          fontSize: '18px',
          color: '#71717a',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '4px',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: isLong ? '32px' : '64px',
          fontWeight: 700,
          color: '#18181b',
          lineHeight: 1,
          fontFamily: isLong ? 'sans-serif' : 'monospace',
        }}
      >
        {value}
      </span>
      {suffix ? (
        <span
          style={{
            fontSize: '18px',
            color: '#71717a',
            marginTop: '8px',
          }}
        >
          {suffix}
        </span>
      ) : null}
    </div>
  )
}
