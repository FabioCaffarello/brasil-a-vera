import { describe, expect, it } from 'vitest'
import { DateRange } from '@/core/shared/domain/value-objects/date-range.vo'
import { TrustMetadata } from '@/core/shared/domain/value-objects/trust-metadata.vo'
import { FiliacaoPartidaria } from '../filiacao-partidaria.entity'
import { FrenteParlamentar } from '../frente-parlamentar.entity'
import { Mandato } from '../mandato.entity'
import { MembroComissao } from '../membro-comissao.entity'
import { Parlamentar } from '../parlamentar.aggregate'
import { Legislatura } from '../value-objects/legislatura.vo'
import { Partido } from '../value-objects/partido.vo'

describe('Parlamentar Aggregate', () => {
  describe('create', () => {
    it('should create a parlamentar via factory', () => {
      const parlamentar = Parlamentar.create({
        idExterno: '12345',
        nome: 'João da Silva',
        uf: 'SP',
        partidoSigla: 'PT',
        partidoNome: 'Partido dos Trabalhadores',
        casa: 'CAMARA',
        sourceUrl: 'https://dadosabertos.camara.leg.br',
      })

      expect(parlamentar.nome).toBe('João da Silva')
      expect(parlamentar.uf).toBe('SP')
      expect(parlamentar.partidoAtual.sigla).toBe('PT')
      expect(parlamentar.casa).toBe('CAMARA')
      expect(parlamentar.trust.trustLevel).toBe('L1')
      expect(parlamentar.notification.hasErrors()).toBe(false)
    })

    it('should create with optional fields', () => {
      const parlamentar = Parlamentar.create({
        idExterno: '12345',
        nome: 'Maria Santos',
        nomeCivil: 'Maria Aparecida dos Santos',
        cpf: '98765432100',
        uf: 'RJ',
        partidoSigla: 'PSOL',
        partidoNome: 'Partido Socialismo e Liberdade',
        urlFoto: 'https://example.com/foto.jpg',
        casa: 'SENADO',
        sourceUrl: 'https://dadosabertos.senado.leg.br',
      })

      expect(parlamentar.nomeCivil).toBe('Maria Aparecida dos Santos')
      expect(parlamentar.cpf).toBe('98765432100')
      expect(parlamentar.urlFoto).toBe('https://example.com/foto.jpg')
    })

    it('should add validation errors for invalid data', () => {
      const parlamentar = Parlamentar.create({
        idExterno: '12345',
        nome: '',
        uf: 'X',
        partidoSigla: 'PT',
        partidoNome: 'Partido dos Trabalhadores',
        casa: 'CAMARA',
        sourceUrl: 'https://example.com',
      })

      expect(parlamentar.notification.hasErrors()).toBe(true)
    })
  })

  describe('changePartido', () => {
    it('should change the partido and update timestamp', () => {
      const parlamentar = Parlamentar.create({
        idExterno: '12345',
        nome: 'João da Silva',
        uf: 'SP',
        partidoSigla: 'PT',
        partidoNome: 'Partido dos Trabalhadores',
        casa: 'CAMARA',
        sourceUrl: 'https://example.com',
      })

      const before = parlamentar.updatedAt
      parlamentar.changePartido('PL', 'Partido Liberal')

      expect(parlamentar.partidoAtual.sigla).toBe('PL')
      expect(parlamentar.partidoAtual.nome).toBe('Partido Liberal')
      expect(parlamentar.updatedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      )
    })
  })

  describe('addMandato', () => {
    it('should add a mandato', () => {
      const parlamentar = Parlamentar.create({
        idExterno: '12345',
        nome: 'João da Silva',
        uf: 'SP',
        partidoSigla: 'PT',
        partidoNome: 'Partido dos Trabalhadores',
        casa: 'CAMARA',
        sourceUrl: 'https://example.com',
      })

      const mandato = new Mandato({
        legislatura: new Legislatura(
          57,
          new DateRange(new Date(2023, 0, 1), new Date(2027, 0, 31)),
        ),
        periodo: new DateRange(new Date(2023, 0, 1), new Date(2027, 0, 31)),
        situacao: 'EXERCICIO',
      })

      parlamentar.addMandato(mandato)
      expect(parlamentar.mandatos).toHaveLength(1)
    })
  })

  describe('addFiliacao', () => {
    it('should add a filiacao partidaria', () => {
      const parlamentar = Parlamentar.create({
        idExterno: '12345',
        nome: 'João',
        uf: 'SP',
        partidoSigla: 'PT',
        partidoNome: 'Partido dos Trabalhadores',
        casa: 'CAMARA',
        sourceUrl: 'https://example.com',
      })

      const filiacao = new FiliacaoPartidaria(
        new Partido('PT', 'Partido dos Trabalhadores'),
        new DateRange(new Date(2020, 0, 1)),
      )

      parlamentar.addFiliacao(filiacao)
      expect(parlamentar.filiacoes).toHaveLength(1)
    })
  })

  describe('addComissao', () => {
    it('should add a comissao membership', () => {
      const parlamentar = Parlamentar.create({
        idExterno: '12345',
        nome: 'João',
        uf: 'SP',
        partidoSigla: 'PT',
        partidoNome: 'Partido dos Trabalhadores',
        casa: 'CAMARA',
        sourceUrl: 'https://example.com',
      })

      const comissao = new MembroComissao(
        'CCJC',
        'Comissão de Constituição e Justiça',
        'TITULAR',
        new DateRange(new Date(2023, 0, 1)),
      )

      parlamentar.addComissao(comissao)
      expect(parlamentar.comissoes).toHaveLength(1)
    })
  })

  describe('addFrente', () => {
    it('should add a frente parlamentar', () => {
      const parlamentar = Parlamentar.create({
        idExterno: '12345',
        nome: 'João',
        uf: 'SP',
        partidoSigla: 'PT',
        partidoNome: 'Partido dos Trabalhadores',
        casa: 'CAMARA',
        sourceUrl: 'https://example.com',
      })

      const frente = new FrenteParlamentar(
        'FP001',
        'Frente Parlamentar da Educação',
        'COORDENADOR',
      )

      parlamentar.addFrente(frente)
      expect(parlamentar.frentes).toHaveLength(1)
    })
  })

  describe('toJSON', () => {
    it('should return a complete JSON representation', () => {
      const parlamentar = Parlamentar.create({
        idExterno: '12345',
        nome: 'João da Silva',
        nomeCivil: 'João Batista',
        cpf: '12345678901',
        uf: 'SP',
        partidoSigla: 'PT',
        partidoNome: 'Partido dos Trabalhadores',
        urlFoto: 'https://example.com/foto.jpg',
        casa: 'CAMARA',
        sourceUrl: 'https://dadosabertos.camara.leg.br',
      })

      const json = parlamentar.toJSON()
      expect(json.parlamentarId).toBeDefined()
      expect(json.idExterno).toBe('12345')
      expect(json.nome).toBe('João da Silva')
      expect(json.nomeCivil).toBe('João Batista')
      expect(json.uf).toBe('SP')
      expect(json.partidoAtual).toEqual({
        sigla: 'PT',
        nome: 'Partido dos Trabalhadores',
      })
      expect(json.casa).toBe('CAMARA')
      expect(json.trustLevel).toBe('L1')
    })
  })

  describe('constructor with explicit trust', () => {
    it('should accept custom TrustMetadata', () => {
      const trust = TrustMetadata.aggregated('https://source.example.com')
      const parlamentar = new Parlamentar({
        idExterno: '12345',
        nome: 'Test',
        uf: 'SP',
        partidoAtual: new Partido('PT', 'PT'),
        casa: 'CAMARA',
        trust,
      })

      expect(parlamentar.trust.trustLevel).toBe('L2')
    })
  })
})
