// Chrome compartilhado dos cards OpenGraph. Todos os cards do Brasil à Vera
// compartilham um rodapé com a identidade da plataforma e o slogan.
//
// Constraints do satori (engine do next/og):
// - Todo `<div>` com múltiplos filhos precisa de `display: 'flex'`.
// - Apenas um subconjunto de CSS suportado (sem CSS vars, calc, etc).

import { ImageResponse } from 'next/og'

export const OG_SIZE = { width: 1200, height: 630 } as const
export const OG_CONTENT_TYPE = 'image/png'

export function BrandFooter() {
  return (
    <div
      style={{
        display: 'flex',
        height: '72px',
        backgroundColor: '#18181b',
        color: '#fafafa',
        padding: '0 80px',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '20px',
      }}
    >
      <span style={{ fontWeight: 600 }}>Brasil à Vera</span>
      <span style={{ color: '#a1a1aa' }}>
        Você escolheu quem te representa. Agora veja o que ele faz.
      </span>
    </div>
  )
}

export function truncate(s: string, max: number): string {
  if (!s) return ''
  return s.length <= max ? s : `${s.slice(0, max - 1).trim()}…`
}

export function fallbackOg(label: string): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fafafa',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ fontSize: '48px', color: '#71717a' }}>{label}</div>
      <div
        style={{
          fontSize: '32px',
          fontWeight: 600,
          color: '#18181b',
          marginTop: '16px',
        }}
      >
        Brasil à Vera
      </div>
    </div>,
    OG_SIZE,
  )
}
