import { describe, expect, it } from 'vitest'

import { classifyDirecao, eContraditorio } from './direcao-classifier'

describe('classifyDirecao', () => {
  describe('verbos restritivos', () => {
    it('detecta "proíbe"', () => {
      expect(classifyDirecao('Proíbe o uso de agrotóxicos X em áreas Y.')).toBe(
        'RESTRITIVA',
      )
    })
    it('detecta "revoga"', () => {
      expect(classifyDirecao('Revoga o artigo 5° da Lei tal.')).toBe(
        'RESTRITIVA',
      )
    })
    it('detecta "veda"', () => {
      expect(classifyDirecao('Veda o porte de armas em escolas.')).toBe(
        'RESTRITIVA',
      )
    })
    it('detecta "criminaliza"', () => {
      expect(classifyDirecao('Criminaliza a homofobia.')).toBe('RESTRITIVA')
    })
    it('detecta "restringe", "limita", "suspende", "extingue"', () => {
      expect(classifyDirecao('Restringe o uso de X.')).toBe('RESTRITIVA')
      expect(classifyDirecao('Limita o horário de Y.')).toBe('RESTRITIVA')
      expect(classifyDirecao('Suspende a aplicação da Lei.')).toBe('RESTRITIVA')
      expect(classifyDirecao('Extingue o benefício Z.')).toBe('RESTRITIVA')
    })
  })

  describe('verbos permissivos', () => {
    it('detecta "autoriza"', () => {
      expect(classifyDirecao('Autoriza o uso de X em locais Y.')).toBe(
        'PERMISSIVA',
      )
    })
    it('detecta "flexibiliza"', () => {
      expect(classifyDirecao('Flexibiliza regras para agrotóxicos.')).toBe(
        'PERMISSIVA',
      )
    })
    it('detecta "permite", "amplia", "libera", "cria", "institui", "concede", "isenta"', () => {
      expect(classifyDirecao('Permite o uso de X.')).toBe('PERMISSIVA')
      expect(classifyDirecao('Amplia o programa Y.')).toBe('PERMISSIVA')
      expect(classifyDirecao('Libera o transporte de Z.')).toBe('PERMISSIVA')
      expect(classifyDirecao('Cria o programa novo.')).toBe('PERMISSIVA')
      expect(classifyDirecao('Institui a política X.')).toBe('PERMISSIVA')
      expect(classifyDirecao('Concede isenção tributária.')).toBe('PERMISSIVA')
      expect(classifyDirecao('Isenta empresas do tributo X.')).toBe(
        'PERMISSIVA',
      )
    })
  })

  describe('ambiguidade — falso negativo > falso positivo', () => {
    it('verbos de ambas as direções → NAO_CLASSIFICADA', () => {
      expect(classifyDirecao('Proíbe o uso de X e autoriza o uso de Y.')).toBe(
        'NAO_CLASSIFICADA',
      )
    })
    it('verbos genéricos ("altera", "modifica") → NAO_CLASSIFICADA', () => {
      expect(classifyDirecao('Altera dispositivos da Lei X.')).toBe(
        'NAO_CLASSIFICADA',
      )
      expect(classifyDirecao('Modifica regulamento.')).toBe('NAO_CLASSIFICADA')
      expect(classifyDirecao('Regulamenta a matéria Y.')).toBe(
        'NAO_CLASSIFICADA',
      )
    })
    it('ementa vazia ou null → NAO_CLASSIFICADA', () => {
      expect(classifyDirecao('')).toBe('NAO_CLASSIFICADA')
      expect(classifyDirecao(null)).toBe('NAO_CLASSIFICADA')
      expect(classifyDirecao(undefined)).toBe('NAO_CLASSIFICADA')
    })
  })

  describe('robustez', () => {
    it('é case-insensitive', () => {
      expect(classifyDirecao('PROÍBE o uso')).toBe('RESTRITIVA')
      expect(classifyDirecao('Autoriza...')).toBe('PERMISSIVA')
    })
    it('ignora acentos', () => {
      expect(classifyDirecao('Proibe sem acento')).toBe('RESTRITIVA')
    })
    it('match por palavra inteira — não pega substring de outra palavra', () => {
      // "concedência" não existe como palavra, mas se existisse, "concede"
      // como prefixo não deveria pegar. Teste com word boundary.
      expect(classifyDirecao('Aproveita os termos vigentes.')).toBe(
        'NAO_CLASSIFICADA',
      )
    })
  })
})

describe('eContraditorio', () => {
  it('SIM em restritiva + SIM em permissiva → contraditório', () => {
    expect(
      eContraditorio(
        { direcao: 'RESTRITIVA', voto: 'SIM' },
        { direcao: 'PERMISSIVA', voto: 'SIM' },
      ),
    ).toBe(true)
  })
  it('NÃO em restritiva + NÃO em permissiva → contraditório', () => {
    expect(
      eContraditorio(
        { direcao: 'RESTRITIVA', voto: 'NAO' },
        { direcao: 'PERMISSIVA', voto: 'NAO' },
      ),
    ).toBe(true)
  })
  it('SIM em restritiva + NÃO em permissiva → coerente (pró-restrição)', () => {
    expect(
      eContraditorio(
        { direcao: 'RESTRITIVA', voto: 'SIM' },
        { direcao: 'PERMISSIVA', voto: 'NAO' },
      ),
    ).toBe(false)
  })
  it('NÃO em restritiva + SIM em permissiva → coerente (pró-permissão)', () => {
    expect(
      eContraditorio(
        { direcao: 'RESTRITIVA', voto: 'NAO' },
        { direcao: 'PERMISSIVA', voto: 'SIM' },
      ),
    ).toBe(false)
  })
  it('mesma direção → nunca contraditório (são votos sobre direção igual)', () => {
    expect(
      eContraditorio(
        { direcao: 'RESTRITIVA', voto: 'SIM' },
        { direcao: 'RESTRITIVA', voto: 'NAO' },
      ),
    ).toBe(false)
  })
  it('alguma NAO_CLASSIFICADA → não conta como contradição', () => {
    expect(
      eContraditorio(
        { direcao: 'NAO_CLASSIFICADA', voto: 'SIM' },
        { direcao: 'PERMISSIVA', voto: 'SIM' },
      ),
    ).toBe(false)
  })
})
