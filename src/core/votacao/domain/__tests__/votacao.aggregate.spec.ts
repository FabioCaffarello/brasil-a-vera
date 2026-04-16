import { describe, expect, it } from 'vitest'
import { OrientacaoBancada } from '../value-objects/orientacao-bancada.vo'
import { Votacao } from '../votacao.aggregate'
import { VotoNominal } from '../voto-nominal.entity'

describe('Votacao Aggregate', () => {
  describe('create', () => {
    it('should create a votacao via factory', () => {
      const votacao = Votacao.create({
        idExterno: '54321',
        proposicaoIdExterno: '12345',
        dataHora: new Date('2024-06-15T14:00:00Z'),
        descricao: 'PL 1234/2024',
        orgao: 'Plenário',
        votosSim: 300,
        votosNao: 100,
        abstencoes: 10,
        ausentes: 20,
        aprovada: true,
        sourceUrl: 'https://dadosabertos.camara.leg.br',
      })

      expect(votacao.descricao).toBe('PL 1234/2024')
      expect(votacao.orgao).toBe('Plenário')
      expect(votacao.resultado.votosSim).toBe(300)
      expect(votacao.resultado.aprovada).toBe(true)
      expect(votacao.trust.trustLevel).toBe('L1')
      expect(votacao.notification.hasErrors()).toBe(false)
    })

    it('should add validation errors for invalid data', () => {
      const votacao = Votacao.create({
        idExterno: '54321',
        dataHora: new Date('2024-06-15T14:00:00Z'),
        descricao: '',
        orgao: '',
        votosSim: 0,
        votosNao: 0,
        abstencoes: 0,
        ausentes: 0,
        aprovada: false,
        sourceUrl: 'https://example.com',
      })
      expect(votacao.notification.hasErrors()).toBe(true)
    })
  })

  describe('addVoto', () => {
    it('should add a voto nominal', () => {
      const votacao = Votacao.create({
        idExterno: '54321',
        dataHora: new Date('2024-06-15T14:00:00Z'),
        descricao: 'PL 1234/2024',
        orgao: 'Plenário',
        votosSim: 1,
        votosNao: 0,
        abstencoes: 0,
        ausentes: 0,
        aprovada: true,
        sourceUrl: 'https://example.com',
      })

      votacao.addVoto(
        new VotoNominal({
          parlamentarIdExterno: '1001',
          tipoVoto: 'SIM',
          dataHora: new Date('2024-06-15T14:05:00Z'),
        }),
      )

      expect(votacao.votos).toHaveLength(1)
      expect(votacao.votos[0].tipoVoto).toBe('SIM')
    })
  })

  describe('addOrientacao', () => {
    it('should add an orientacao de bancada', () => {
      const votacao = Votacao.create({
        idExterno: '54321',
        dataHora: new Date('2024-06-15T14:00:00Z'),
        descricao: 'PL 1234/2024',
        orgao: 'Plenário',
        votosSim: 1,
        votosNao: 0,
        abstencoes: 0,
        ausentes: 0,
        aprovada: true,
        sourceUrl: 'https://example.com',
      })

      votacao.addOrientacao(new OrientacaoBancada('PT', 'SIM'))
      expect(votacao.orientacoes).toHaveLength(1)
    })
  })

  describe('toJSON', () => {
    it('should return complete JSON', () => {
      const votacao = Votacao.create({
        idExterno: '54321',
        proposicaoIdExterno: '12345',
        dataHora: new Date('2024-06-15T14:00:00Z'),
        descricao: 'PL 1234/2024',
        orgao: 'Plenário',
        votosSim: 300,
        votosNao: 100,
        abstencoes: 10,
        ausentes: 20,
        aprovada: true,
        sourceUrl: 'https://example.com',
      })

      const json = votacao.toJSON()
      expect(json.votacaoId).toBeDefined()
      expect(json.descricao).toBe('PL 1234/2024')
      expect(json.resultado).toEqual({
        votosSim: 300,
        votosNao: 100,
        abstencoes: 10,
        ausentes: 20,
        aprovada: true,
      })
    })
  })
})
