import { describe, expect, it } from 'vitest'

import { buildShareUrl } from './share-url'

describe('buildShareUrl', () => {
  it('anexa utm_source por canal + utm_medium=share', () => {
    expect(
      buildShareUrl('https://brasilavera.org/parlamentares/abc', 'whatsapp'),
    ).toBe(
      'https://brasilavera.org/parlamentares/abc?utm_source=whatsapp&utm_medium=share',
    )
    expect(buildShareUrl('https://brasilavera.org/p/x', 'twitter')).toContain(
      'utm_source=twitter',
    )
    expect(buildShareUrl('https://brasilavera.org/p/x', 'copy')).toContain(
      'utm_source=copy',
    )
  })

  it('canonicaliza: descarta query (cursor/filtro) e hash de quem compartilha', () => {
    const out = buildShareUrl(
      'https://brasilavera.org/parlamentares/abc?votos_after=xyz&propos_tipo=PL#votos',
      'whatsapp',
    )
    expect(out).toBe(
      'https://brasilavera.org/parlamentares/abc?utm_source=whatsapp&utm_medium=share',
    )
    expect(out).not.toContain('votos_after')
    expect(out).not.toContain('#votos')
  })

  it('não duplica utm quando a URL já tinha um (substitui)', () => {
    const out = buildShareUrl(
      'https://brasilavera.org/p/x?utm_source=old&utm_medium=old',
      'copy',
    )
    expect(out).toBe(
      'https://brasilavera.org/p/x?utm_source=copy&utm_medium=share',
    )
    expect(out.match(/utm_source/g)).toHaveLength(1)
  })

  it('preserva host/porta/path', () => {
    expect(
      buildShareUrl('http://localhost:3000/parlamentares/abc', 'copy'),
    ).toBe(
      'http://localhost:3000/parlamentares/abc?utm_source=copy&utm_medium=share',
    )
  })

  it('URL inválida volta como veio (sem quebrar em SSR)', () => {
    expect(buildShareUrl('', 'copy')).toBe('')
  })
})
