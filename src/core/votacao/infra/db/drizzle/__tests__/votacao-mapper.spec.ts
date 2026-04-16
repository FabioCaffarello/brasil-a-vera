import { describe, expect, it } from 'vitest'
import { VotacaoId } from '../../../../domain/value-objects/votacao-id.vo'
import { VotacaoFakeBuilder } from '../../../../domain/votacao-fake.builder'
import { votacaoToDomain, votacaoToPersistence } from '../votacao-mapper'

describe('VotacaoMapper', () => {
  const fixedId = new VotacaoId('550e8400-e29b-41d4-a716-446655440000')
  const fixedDate = new Date('2024-06-15T14:00:00.000Z')

  describe('votacaoToPersistence', () => {
    it('should convert a full aggregate', () => {
      const votacao = VotacaoFakeBuilder.aVotacao()
        .withVotacaoId(fixedId)
        .build()
      const data = votacaoToPersistence(votacao)

      expect(data.votacao.id).toBe(fixedId.id)
      expect(data.votacao.descricao).toBe('PL 1234/2024 - Emenda substitutiva')
      expect(data.votacao.votosSim).toBe(300)
      expect(data.votacao.aprovada).toBe(true)
      expect(data.votos).toHaveLength(3)
      expect(data.votos[0].parlamentarIdExterno).toBe('1001')
      expect(data.orientacoes).toHaveLength(4)
      expect(data.orientacoes[0].partidoSigla).toBe('PT')
    })
  })

  describe('votacaoToDomain', () => {
    it('should reconstruct aggregate from rows', () => {
      const votacaoRow = {
        id: fixedId.id,
        idExterno: '54321',
        proposicaoIdExterno: '12345',
        dataHora: fixedDate,
        descricao: 'PL 1234/2024',
        orgao: 'Plenário',
        votosSim: 300,
        votosNao: 100,
        abstencoes: 10,
        ausentes: 20,
        aprovada: true,
        trustLevel: 'L1',
        sourceUrl: 'https://example.com',
        createdAt: fixedDate,
        updatedAt: fixedDate,
      }

      const votoRows = [
        {
          id: '660e8400-e29b-41d4-a716-446655440001',
          votacaoId: fixedId.id,
          parlamentarIdExterno: '1001',
          tipoVoto: 'SIM',
          dataHora: fixedDate,
        },
      ]

      const orientacaoRows = [
        {
          id: '770e8400-e29b-41d4-a716-446655440001',
          votacaoId: fixedId.id,
          partidoSigla: 'PT',
          orientacao: 'SIM',
        },
      ]

      const entity = votacaoToDomain(votacaoRow, votoRows, orientacaoRows)

      expect(entity.votacaoId.id).toBe(fixedId.id)
      expect(entity.descricao).toBe('PL 1234/2024')
      expect(entity.resultado.votosSim).toBe(300)
      expect(entity.votos).toHaveLength(1)
      expect(entity.votos[0].parlamentarIdExterno).toBe('1001')
      expect(entity.orientacoes).toHaveLength(1)
      expect(entity.orientacoes[0].partidoSigla).toBe('PT')
    })

    it('should handle empty child rows', () => {
      const votacaoRow = {
        id: fixedId.id,
        idExterno: '54321',
        proposicaoIdExterno: null,
        dataHora: fixedDate,
        descricao: 'Test',
        orgao: 'Plenário',
        votosSim: 0,
        votosNao: 0,
        abstencoes: 0,
        ausentes: 0,
        aprovada: false,
        trustLevel: 'L1',
        sourceUrl: 'https://example.com',
        createdAt: fixedDate,
        updatedAt: fixedDate,
      }
      const entity = votacaoToDomain(votacaoRow, [], [])
      expect(entity.votos).toHaveLength(0)
      expect(entity.orientacoes).toHaveLength(0)
      expect(entity.proposicaoIdExterno).toBeNull()
    })
  })

  describe('round-trip', () => {
    it('should produce equivalent entity', () => {
      const original = VotacaoFakeBuilder.aVotacao()
        .withVotacaoId(fixedId)
        .build()
      const persisted = votacaoToPersistence(original)

      const reconstructed = votacaoToDomain(
        persisted.votacao as Parameters<typeof votacaoToDomain>[0],
        persisted.votos as Parameters<typeof votacaoToDomain>[1],
        persisted.orientacoes.map((o) => ({
          ...o,
          id: '00000000-0000-0000-0000-000000000000',
        })) as Parameters<typeof votacaoToDomain>[2],
      )

      expect(reconstructed.votacaoId.id).toBe(original.votacaoId.id)
      expect(reconstructed.descricao).toBe(original.descricao)
      expect(reconstructed.resultado.votosSim).toBe(original.resultado.votosSim)
      expect(reconstructed.votos).toHaveLength(original.votos.length)
      expect(reconstructed.orientacoes).toHaveLength(
        original.orientacoes.length,
      )
    })
  })
})
