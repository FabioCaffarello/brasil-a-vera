import { describe, expect, it } from 'vitest'
import { ProposicaoFakeBuilder } from '../../../../domain/proposicao-fake.builder'
import { ProposicaoId } from '../../../../domain/value-objects/proposicao-id.vo'
import {
  type ProposicaoRow,
  proposicaoToDomain,
  proposicaoToPersistence,
} from '../proposicao-mapper'

describe('ProposicaoMapper', () => {
  const fixedId = new ProposicaoId('550e8400-e29b-41d4-a716-446655440000')
  const fixedDate = new Date('2025-03-10T00:00:00.000Z')

  function buildFullProposicao() {
    const prop = ProposicaoFakeBuilder.aProposicao()
      .withProposicaoId(fixedId)
      .withIdExterno('camara-12345')
      .withCasa('CAMARA')
      .withTipo('PL')
      .withNumero(1234)
      .withAno(2025)
      .withEmenta('Ementa de teste')
      .withSituacao('TRAMITANDO')
      .withAutores(['Fulano', 'Beltrano'])
      .withTemas([{ codigoOficial: 40, nome: 'Educação' }])
      .build()
    prop.createdAt = fixedDate
    prop.updatedAt = fixedDate
    return prop
  }

  describe('proposicaoToPersistence', () => {
    it('should convert full aggregate to persistence format', () => {
      const prop = buildFullProposicao()
      const data = proposicaoToPersistence(prop)

      expect(data.id).toBe(fixedId.id)
      expect(data.idExterno).toBe('camara-12345')
      expect(data.casa).toBe('CAMARA')
      expect(data.tipo).toBe('PL')
      expect(data.numero).toBe(1234)
      expect(data.ano).toBe(2025)
      expect(data.autores).toEqual(['Fulano', 'Beltrano'])
      expect(data.temas).toEqual([{ codigoOficial: 40, nome: 'Educação' }])
      expect(data.situacao).toBe('TRAMITANDO')
      expect(data.trustLevel).toBe('L1')
    })
  })

  describe('proposicaoToDomain', () => {
    it('should reconstruct aggregate from DB row', () => {
      const row: ProposicaoRow = {
        id: fixedId.id,
        idExterno: 'camara-12345',
        casa: 'CAMARA',
        tipo: 'PL',
        numero: 1234,
        ano: 2025,
        ementa: 'Ementa',
        ementaDetalhada: null,
        dataApresentacao: fixedDate,
        autores: ['Fulano'],
        temas: [{ codigoOficial: 40, nome: 'Educação' }],
        situacao: 'TRAMITANDO',
        situacaoDescricao: null,
        urlInteiroTeor: null,
        trustLevel: 'L1',
        sourceUrl: 'https://dadosabertos.camara.leg.br',
        createdAt: fixedDate,
        updatedAt: fixedDate,
      }

      const entity = proposicaoToDomain(row)

      expect(entity.proposicaoId.id).toBe(fixedId.id)
      expect(entity.idExterno).toBe('camara-12345')
      expect(entity.tipo).toBe('PL')
      expect(entity.autores).toEqual(['Fulano'])
      expect(entity.temas).toHaveLength(1)
      expect(entity.temas[0].nome).toBe('Educação')
      expect(entity.dataApresentacao).toEqual(fixedDate)
    })

    it('should fallback unknown tipo to OUTRO', () => {
      const row: ProposicaoRow = {
        id: fixedId.id,
        idExterno: 'x',
        casa: 'CAMARA',
        tipo: 'TIPO_NOVO_QUE_NAO_EXISTE',
        numero: 1,
        ano: 2025,
        ementa: 'e',
        ementaDetalhada: null,
        dataApresentacao: null,
        autores: [],
        temas: [],
        situacao: 'TRAMITANDO',
        situacaoDescricao: null,
        urlInteiroTeor: null,
        trustLevel: 'L1',
        sourceUrl: 'x',
        createdAt: fixedDate,
        updatedAt: fixedDate,
      }

      const entity = proposicaoToDomain(row)
      expect(entity.tipo).toBe('OUTRO')
    })

    it('should fallback unknown situacao to DESCONHECIDA', () => {
      const row: ProposicaoRow = {
        id: fixedId.id,
        idExterno: 'x',
        casa: 'CAMARA',
        tipo: 'PL',
        numero: 1,
        ano: 2025,
        ementa: 'e',
        ementaDetalhada: null,
        dataApresentacao: null,
        autores: [],
        temas: [],
        situacao: 'SITUACAO_INESPERADA',
        situacaoDescricao: null,
        urlInteiroTeor: null,
        trustLevel: 'L1',
        sourceUrl: 'x',
        createdAt: fixedDate,
        updatedAt: fixedDate,
      }

      const entity = proposicaoToDomain(row)
      expect(entity.situacao).toBe('DESCONHECIDA')
    })
  })

  describe('round-trip', () => {
    it('should produce equivalent entity after toPersistence → toDomain', () => {
      const original = buildFullProposicao()
      const persisted = proposicaoToPersistence(original)
      const reconstructed = proposicaoToDomain({
        ...persisted,
        createdAt: original.createdAt,
        updatedAt: original.updatedAt,
      } as ProposicaoRow)

      expect(reconstructed.proposicaoId.id).toBe(original.proposicaoId.id)
      expect(reconstructed.idExterno).toBe(original.idExterno)
      expect(reconstructed.tipo).toBe(original.tipo)
      expect(reconstructed.casa).toBe(original.casa)
      expect(reconstructed.numero).toBe(original.numero)
      expect(reconstructed.autores).toEqual(original.autores)
      expect(reconstructed.temas[0].nome).toBe(original.temas[0].nome)
      expect(reconstructed.trust.trustLevel).toBe(original.trust.trustLevel)
    })
  })
})
