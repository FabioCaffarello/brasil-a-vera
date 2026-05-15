import { ImageResponse } from 'next/og'

import { formatNumeroAbreviado } from '@/lib/format-number'
import { BrandFooter, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og/chrome'
import { getPublicStats } from '@/lib/queries/stats-public'

export const alt =
  'Parlamentares — Brasil a Vera, deputados federais e senadores em exercício'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

// Sprint 3.2 Tarefa 1 — OG dinâmico de listagem. Cache 1h no header da
// resposta + force-dynamic (build no Cloudflare Workers usa placeholder
// DATABASE_URL e não consegue pré-renderizar). CF Workers + scraper social
// honram max-age=3600.
export const dynamic = 'force-dynamic'

const CACHE_HEADERS = {
  'cache-control': 'public, max-age=3600, s-maxage=3600',
}

export default async function OgParlamentaresList() {
  const stats = await getPublicStats().catch(() => null)
  const camara = stats?.parlamentaresPorCasa.camara ?? 0
  const senado = stats?.parlamentaresPorCasa.senado ?? 0
  const total = camara + senado

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
            Brasil a Vera · Listagem
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
            Parlamentares
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
            Deputados federais e senadores em exercício, filtráveis por casa,
            partido e UF.
          </div>
        </div>

        {total > 0 ? (
          <div style={{ display: 'flex', gap: '64px' }}>
            <Stat label="Total" value={total} />
            <Stat label="Câmara" value={camara} />
            <Stat label="Senado" value={senado} />
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              fontSize: '24px',
              color: '#71717a',
            }}
          >
            Câmara dos Deputados · Senado Federal · Dados oficiais
          </div>
        )}
      </div>
      <BrandFooter />
    </div>,
    { ...size, headers: CACHE_HEADERS },
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
          fontSize: '72px',
          fontWeight: 700,
          color: '#18181b',
          lineHeight: 1,
          fontFamily: 'monospace',
        }}
      >
        {formatNumeroAbreviado(value)}
      </span>
    </div>
  )
}
