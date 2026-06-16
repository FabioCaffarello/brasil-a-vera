// Exercita o gate de contraste (scripts/wcag-check.ts, issue #362).
//
// "Verde só vale com vermelho demonstrado": além de provar que os tokens reais
// de hoje passam AA, reconstrói os valores do incidente #361 e prova que o gate
// OS PEGA — i.e., que o defeito de 3 dias em produção não voltaria silencioso.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { evaluate, failures, parseTokens, type Tokens } from './wcag-check'

const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8')

describe('wcag-check — parsing (anti-drift)', () => {
  const tokens = parseTokens(css)

  it('extrai os tokens semânticos light e dark do globals.css', () => {
    expect(tokens.light.get('foreground')).toBeTruthy()
    expect(tokens.light.get('background')).toBeTruthy()
    expect(tokens.dark.get('foreground')).toBeTruthy()
  })

  it('resolve var(--color-primary-*) para o HEX da escala navy', () => {
    // dark --primary = var(--color-primary-400) = #7390ad (follow-up #363)
    expect(tokens.dark.get('primary')).toBe('#7390ad')
    // dark --ring = var(--color-primary-300) = #9fb3c8
    expect(tokens.dark.get('ring')).toBe('#9fb3c8')
    // light --primary = var(--color-primary-700) = #243b53
    expect(tokens.light.get('primary')).toBe('#243b53')
    // nenhum valor resolvido pode conter var( residual
    for (const v of [...tokens.light.values(), ...tokens.dark.values()]) {
      expect(v).not.toContain('var(')
    }
  })
})

describe('wcag-check — gate', () => {
  it('os tokens reais de HOJE passam WCAG AA (guarda de regressão)', () => {
    const fails = failures(evaluate(parseTokens(css)))
    // mensagem legível se quebrar no futuro
    expect(fails.map((f) => `[${f.pair.theme}] ${f.pair.label}`)).toEqual([])
  })

  it('pega o cenário #361: --primary dark = navy-500 (#486581) falha AA body', () => {
    const t = parseTokens(css)
    const regressed: Tokens = { light: t.light, dark: new Map(t.dark) }
    regressed.dark.set('primary', '#486581') // navy-500 — valor do #361 (3.28:1)
    const fails = failures(evaluate(regressed))
    const labels = fails
      .filter((f) => f.pair.theme === 'dark')
      .map((f) => f.pair.label)
    // texto do botão (primary-foreground) sobre navy-500 cai abaixo de 4.5
    expect(labels).toContain('primary-foreground / primary (button)')
  })

  it('token removido do globals → falha dura (não valida ficção)', () => {
    const t = parseTokens(css)
    const broken: Tokens = { light: t.light, dark: new Map(t.dark) }
    broken.dark.delete('foreground')
    const fails = failures(evaluate(broken))
    expect(
      fails.some(
        (f) => f.status === 'MISSING' && f.missing.includes('foreground'),
      ),
    ).toBe(true)
  })
})
