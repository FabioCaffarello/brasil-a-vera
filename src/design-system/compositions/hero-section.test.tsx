import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { HeroSection } from './hero-section'

describe('HeroSection composition', () => {
  it('renderiza título como h1', () => {
    render(<HeroSection title="Olá mundo" />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.textContent).toBe('Olá mundo')
  })

  it('aplica .bg-hero e .grid-bg na variante gradient (default)', () => {
    const { container } = render(<HeroSection title="Hero" />)
    const section = container.querySelector('section')
    expect(section?.className).toContain('bg-hero')
    expect(section?.className).toContain('grid-bg')
  })

  it('aplica .text-gradient no h1 da variante gradient', () => {
    render(<HeroSection title="Hero" />)
    const heading = screen.getByRole('heading', { level: 1 })
    const gradientSpan = heading.querySelector('.text-gradient')
    expect(gradientSpan).not.toBeNull()
    expect(gradientSpan?.textContent).toBe('Hero')
  })

  it('NÃO aplica .bg-hero, .grid-bg nem .text-gradient na variante plain', () => {
    const { container } = render(<HeroSection title="Plain" variant="plain" />)
    const section = container.querySelector('section')
    expect(section?.className).not.toContain('bg-hero')
    expect(section?.className).not.toContain('grid-bg')
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading.querySelector('.text-gradient')).toBeNull()
    expect(heading.textContent).toBe('Plain')
  })

  it('renderiza kicker quando fornecido', () => {
    render(<HeroSection kicker="Wave 6" title="Frontend" />)
    expect(screen.getByText('Wave 6')).toBeDefined()
  })

  it('não renderiza kicker quando ausente (sem container vazio)', () => {
    render(<HeroSection title="Sem kicker" />)
    // Garante que NÃO existe um container de kicker vazio antes do H1
    const heading = screen.getByRole('heading', { level: 1 })
    const prev = heading.previousElementSibling
    expect(prev).toBeNull()
  })

  it('renderiza description quando fornecido', () => {
    render(
      <HeroSection
        title="Frontend"
        description="Reskin diagnóstico-dirigido"
      />,
    )
    expect(screen.getByText('Reskin diagnóstico-dirigido')).toBeDefined()
  })

  it('renderiza actions quando fornecido', () => {
    render(
      <HeroSection
        title="Frontend"
        actions={<button type="button">Começar</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'Começar' })).toBeDefined()
  })

  it('preserva className do consumer', () => {
    const { container } = render(
      <HeroSection title="x" className="custom-class" />,
    )
    expect(container.querySelector('section')?.className).toContain(
      'custom-class',
    )
  })

  it('renderiza variante completa (kicker + title + description + actions)', () => {
    render(
      <HeroSection
        kicker="Wave 6"
        title="Frontend de Excelência"
        description="Reskin diagnóstico-dirigido"
        actions={
          <>
            <button type="button">Primary</button>
            <button type="button">Secondary</button>
          </>
        }
      />,
    )
    expect(screen.getByText('Wave 6')).toBeDefined()
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Frontend de Excelência',
    )
    expect(screen.getByText('Reskin diagnóstico-dirigido')).toBeDefined()
    expect(screen.getByRole('button', { name: 'Primary' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Secondary' })).toBeDefined()
  })

  describe('variante gradient-glow', () => {
    it('aplica .bg-hero, .grid-bg, .hero-glow e .hero-stagger', () => {
      const { container } = render(
        <HeroSection title="Glow" variant="gradient-glow" />,
      )
      const section = container.querySelector('section')
      expect(section?.className).toContain('bg-hero')
      expect(section?.className).toContain('grid-bg')
      expect(section?.className).toContain('hero-glow')
      expect(container.querySelector('.hero-stagger')).not.toBeNull()
    })

    it('aplica .text-gradient no h1 (gradient-glow herda do gradient)', () => {
      render(<HeroSection title="Glow" variant="gradient-glow" />)
      const heading = screen.getByRole('heading', { level: 1 })
      const gradientSpan = heading.querySelector('.text-gradient')
      expect(gradientSpan).not.toBeNull()
      expect(gradientSpan?.textContent).toBe('Glow')
    })

    it('renderiza 3 blobs + accent line, todos aria-hidden', () => {
      const { container } = render(
        <HeroSection title="Glow" variant="gradient-glow" />,
      )
      const blobs = container.querySelectorAll('.hero-glow__blob')
      expect(blobs.length).toBe(3)
      const line = container.querySelector('.hero-glow__accent-line')
      expect(line).not.toBeNull()
      for (const decorative of [...Array.from(blobs), line]) {
        expect(decorative?.getAttribute('aria-hidden')).toBe('true')
      }
    })

    it('NÃO aplica .hero-glow na variante gradient (default)', () => {
      const { container } = render(<HeroSection title="Plain gradient" />)
      const section = container.querySelector('section')
      expect(section?.className).not.toContain('hero-glow')
      expect(container.querySelector('.hero-glow__blob')).toBeNull()
      expect(container.querySelector('.hero-stagger')).toBeNull()
    })
  })

  describe('slot kpis', () => {
    it('renderiza kpis quando fornecido', () => {
      render(
        <HeroSection
          title="Com KPIs"
          kpis={<span data-testid="kpi-cell">513 deputados</span>}
        />,
      )
      expect(screen.getByTestId('kpi-cell').textContent).toBe('513 deputados')
    })

    it('não renderiza container de kpis quando ausente', () => {
      const { container } = render(<HeroSection title="Sem KPIs" />)
      // O container de kpis tem `.mt-10` — garantir que não há div vazia
      const emptyMt10 = container.querySelector('.mt-10:empty')
      expect(emptyMt10).toBeNull()
    })
  })
})
