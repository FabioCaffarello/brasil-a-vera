import { ImageResponse } from 'next/og'

import {
  BrandFooter,
  fallbackOg,
  OG_CONTENT_TYPE,
  OG_SIZE,
  truncate,
} from '@/lib/og/chrome'
import { getParlamentarById } from '@/lib/queries/parlamentares'

export const alt =
  'Parlamentar — Brasil a Vera, plataforma de transparência política'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

interface Props {
  params: Promise<{ id: string }>
}

export default async function OgParlamentar({ params }: Props) {
  const { id } = await params
  const p = await getParlamentarById(id)

  if (!p) {
    return fallbackOg('Parlamentar não encontrado')
  }

  const cargo = p.casa === 'CAMARA' ? 'Deputado Federal' : 'Senador'
  const partidoUf = `${p.partidoSigla} / ${p.uf}`

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
          padding: '80px',
          alignItems: 'center',
          gap: '64px',
        }}
      >
        {p.urlFoto ? (
          // biome-ignore lint/performance/noImgElement: next/image não funciona dentro de ImageResponse (satori). <img> é obrigatório.
          <img
            src={p.urlFoto}
            alt=""
            width={300}
            height={400}
            style={{
              width: '300px',
              height: '400px',
              objectFit: 'cover',
              borderRadius: '16px',
              border: '4px solid #e4e4e7',
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              width: '300px',
              height: '400px',
              borderRadius: '16px',
              backgroundColor: '#e4e4e7',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '120px',
              color: '#a1a1aa',
              fontWeight: 700,
            }}
          >
            {p.nome.charAt(0)}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
          }}
        >
          <div
            style={{
              fontSize: '24px',
              color: '#71717a',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '12px',
            }}
          >
            {cargo}
          </div>
          <div
            style={{
              fontSize: '64px',
              fontWeight: 700,
              color: '#18181b',
              lineHeight: 1.05,
              marginBottom: '24px',
            }}
          >
            {truncate(p.nome, 40)}
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
                fontSize: '36px',
                fontWeight: 600,
                color: '#059669',
                fontFamily: 'monospace',
              }}
            >
              {partidoUf}
            </span>
            {p.legislatura ? (
              <span style={{ fontSize: '24px', color: '#71717a' }}>
                · Legislatura {p.legislatura}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <BrandFooter />
    </div>,
    size,
  )
}
