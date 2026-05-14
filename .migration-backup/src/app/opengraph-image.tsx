import { ImageResponse } from 'next/og'

import { OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og/chrome'

export const alt =
  'Brasil a Vera — plataforma open-source de transparência política brasileira'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

// OG de fallback global. Cobre todas as rotas que não definirem o próprio
// opengraph-image (home, listas, busca). Rotas dinâmicas com fingerprint
// claro (parlamentar, proposição, votação, partido, comparar) têm OG
// próprio que se sobrepõe a este.
export default async function OgRoot() {
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
        padding: '80px',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: '24px',
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
          gap: '24px',
        }}
      >
        <div
          style={{
            fontSize: '120px',
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: '-0.02em',
          }}
        >
          Brasil a Vera
        </div>
        <div
          style={{
            fontSize: '36px',
            color: '#d4d4d8',
            lineHeight: 1.3,
          }}
        >
          Você escolheu quem te representa. Agora veja o que ele faz.
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: '22px',
          color: '#71717a',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Câmara dos Deputados · Senado Federal · Dados oficiais</span>
        <span>open source · doação · custo zero</span>
      </div>
    </div>,
    size,
  )
}
