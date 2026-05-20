import { ImageResponse } from 'next/og'

import { formatNumeroAbreviado } from '@/lib/format-number'
import { BrandFooter, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og/chrome'
import { getPublicStats } from '@/lib/queries/stats-public'

export const alt =
  'Votações — Brasil à Vera, votações nominais na Câmara e no Senado com voto individual'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export const dynamic = 'force-dynamic'

const CACHE_HEADERS = {
  'cache-control': 'public, max-age=3600, s-maxage=3600',
}

function formatUltimaAtualizacao(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  })
}

export default async function OgVotacoesList() {
  const stats = await getPublicStats().catch(() => null)
  const total = stats?.totalVotacoes ?? 0
  const ultima = formatUltimaAtualizacao(
    stats?.ultimaAtualizacaoVotacoes ?? null,
  )

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
            Votações
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
            Votações nominais com voto individual por parlamentar e orientação
            partidária da Câmara.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '64px', alignItems: 'flex-end' }}>
          {total > 0 ? (
            <Stat
              label="Total"
              big={formatNumeroAbreviado(total)}
              hint="votações nominais"
            />
          ) : null}
          <Stat label="Cadência" big="4×" hint="por dia (cron)" />
          {ultima ? (
            <Stat label="Última atualização" big={ultima} mono={false} />
          ) : null}
        </div>
      </div>
      <BrandFooter />
    </div>,
    { ...size, headers: CACHE_HEADERS },
  )
}

function Stat({
  label,
  big,
  hint,
  mono = true,
}: {
  label: string
  big: string
  hint?: string
  mono?: boolean
}) {
  const isLong = big.length > 8
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
          fontSize: isLong ? '48px' : '72px',
          fontWeight: 700,
          color: '#18181b',
          lineHeight: 1,
          fontFamily: mono ? 'monospace' : 'sans-serif',
        }}
      >
        {big}
      </span>
      {hint ? (
        <span
          style={{
            fontSize: '18px',
            color: '#71717a',
            marginTop: '8px',
          }}
        >
          {hint}
        </span>
      ) : null}
    </div>
  )
}
