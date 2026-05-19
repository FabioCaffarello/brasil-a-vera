import { describe, expect, it } from 'vitest'

import { renderMarkdown, wrapHtmlForEmail } from './markdown'

describe('renderMarkdown', () => {
  it('converte heading h1', () => {
    expect(renderMarkdown('# Título')).toContain('<h1>Título</h1>')
  })

  it('converte bold', () => {
    const html = renderMarkdown('texto **negrito** aqui')
    expect(html).toContain('<strong>negrito</strong>')
  })

  it('converte lista não-ordenada', () => {
    const html = renderMarkdown('- item 1\n- item 2')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>item 1</li>')
    expect(html).toContain('<li>item 2</li>')
  })

  it('converte link', () => {
    const html = renderMarkdown('[Brasil à Vera](https://brasilavera.org)')
    expect(html).toContain('href="https://brasilavera.org"')
    expect(html).toContain('Brasil à Vera')
  })

  it('preserva newlines como <br> com gfm breaks', () => {
    const html = renderMarkdown('linha 1\nlinha 2')
    expect(html).toContain('<br>')
  })

  it('converte horizontal rule', () => {
    const html = renderMarkdown('antes\n\n---\n\ndepois')
    expect(html).toContain('<hr>')
  })
})

describe('wrapHtmlForEmail', () => {
  it('envolve com doctype + html + body', () => {
    const out = wrapHtmlForEmail('<p>oi</p>')
    expect(out).toMatch(/^<!doctype html>/i)
    expect(out).toContain('<html lang="pt-BR">')
    expect(out).toContain('<title>Brasil à Vera')
    expect(out).toContain('<body')
    expect(out).toContain('<p>oi</p>')
  })

  it('inclui meta viewport + charset', () => {
    const out = wrapHtmlForEmail('')
    expect(out).toContain('charset="utf-8"')
    expect(out).toContain('viewport')
  })
})
