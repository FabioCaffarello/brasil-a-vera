import { ImageResponse } from 'next/og'

import { BrandFooter, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og/chrome'

export const alt =
  'Encontre os parlamentares que representam seu estado e município — Brasil à Vera'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

// Sprint 3.2 Tarefa 1 — OG estático: números IBGE são constantes (27 UFs,
// 5571 municípios) e o fluxo da rota é centrado em copy ("encontre seus
// representantes"), não em contagem de dados ingeridos. Sem query no DB =
// pode renderizar no build sem fallback dinâmico.

const NUM_UFS = 27
const NUM_MUNICIPIOS = 5571

const CACHE_HEADERS = {
  'cache-control': 'public, max-age=86400, s-maxage=86400',
}

export default function OgMeuParlamentar() {
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
            Brasil à Vera · Quem te representa
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '88px',
              fontWeight: 700,
              color: '#18181b',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            Encontre seus representantes
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
            Comece pela UF, depois pelo município. Veja deputados e senadores
            que representam o seu estado.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '64px', alignItems: 'flex-end' }}>
          <Stat label="UFs" value={NUM_UFS.toLocaleString('pt-BR')} />
          <Stat
            label="Municípios"
            value={NUM_MUNICIPIOS.toLocaleString('pt-BR')}
          />
          <Stat label="Casas" value="2" hint="Câmara · Senado" />
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
  hint,
}: {
  label: string
  value: string
  hint?: string
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
        {value}
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
