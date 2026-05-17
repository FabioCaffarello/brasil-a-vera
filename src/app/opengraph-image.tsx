import { ImageResponse } from 'next/og'
import { formatNumeroAbreviado } from '@/lib/format-number'
import { BrandFooter, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og/chrome'
import { getPublicStats } from '@/lib/queries/stats-public'

export const alt =
  'Brasil à Vera — plataforma open-source de transparência política brasileira'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

// OG da home + fallback global. Rotas com `opengraph-image.tsx` próprio
// (listagens em /parlamentares, /proposicoes, /votacoes, /o-meu-parlamentar
// e entidades em /parlamentares/[id], /proposicoes/[tipo]/..., /votacoes/[id],
// /partidos/[sigla], /comparar) sobrescrevem este.
//
// Render dinâmico para incluir contagens L2 (total de parlamentares, votações,
// proposições). Cache-Control no header instrui scrapers sociais e CDN a
// armazenar por 1h — alinhado com cadência mais alta de ingestão (votações
// 4×/dia). Sprint 3.2 Tarefa 1.
export const dynamic = 'force-dynamic'

const CACHE_HEADERS = {
  'cache-control': 'public, max-age=3600, s-maxage=3600',
}

export default async function OgRoot() {
  const stats = await getPublicStats().catch(() => null)

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#18181b',
        color: '#fafafa',
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
        <div
          style={{
            display: 'flex',
            fontSize: '22px',
            color: '#a1a1aa',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          Transparência política brasileira
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div
            style={{
              fontSize: '108px',
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            Brasil à Vera
          </div>
          <div
            style={{
              fontSize: '32px',
              color: '#d4d4d8',
              lineHeight: 1.3,
            }}
          >
            Você escolheu quem te representa. Agora veja o que ele faz.
          </div>
        </div>
        {stats ? (
          <div style={{ display: 'flex', gap: '64px' }}>
            <Stat label="Parlamentares" value={stats.totalParlamentares} />
            <Stat
              label="Proposições"
              value={formatNumeroAbreviado(stats.totalProposicoes)}
            />
            <Stat
              label="Votações"
              value={formatNumeroAbreviado(stats.totalVotacoes)}
            />
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              fontSize: '20px',
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

function Stat({ label, value }: { label: string; value: number | string }) {
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
          color: '#a1a1aa',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: '4px',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '64px',
          fontWeight: 700,
          color: '#fafafa',
          lineHeight: 1,
          fontFamily: 'monospace',
        }}
      >
        {value}
      </span>
    </div>
  )
}
