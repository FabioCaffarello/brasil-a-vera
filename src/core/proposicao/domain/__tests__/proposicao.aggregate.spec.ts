import { describe, expect, it } from 'vitest'
import { Proposicao } from '../proposicao.aggregate'
import { ProposicaoFakeBuilder } from '../proposicao-fake.builder'

describe('Proposicao Aggregate', () => {
  it('should create a valid Proposicao from command', () => {
    const prop = Proposicao.create({
      idExterno: 'camara-12345',
      casa: 'CAMARA',
      tipo: 'PL',
      numero: 1234,
      ano: 2025,
      ementa: 'Dispõe sobre algo importante.',
      ementaDetalhada: 'Versão expandida da ementa',
      dataApresentacao: '2025-03-10',
      autores: ['Fulano'],
      temas: [{ codigoOficial: 40, nome: 'Educação' }],
      situacao: 'TRAMITANDO',
      situacaoDescricao: 'Aguardando relator',
      urlInteiroTeor: 'https://example.com/teor.pdf',
      sourceUrl: 'https://dadosabertos.camara.leg.br',
    })

    expect(prop.idExterno).toBe('camara-12345')
    expect(prop.casa).toBe('CAMARA')
    expect(prop.tipo).toBe('PL')
    expect(prop.numero).toBe(1234)
    expect(prop.ano).toBe(2025)
    expect(prop.ementa).toBe('Dispõe sobre algo importante.')
    expect(prop.dataApresentacao).toEqual(new Date('2025-03-10'))
    expect(prop.autores).toEqual(['Fulano'])
    expect(prop.temas).toHaveLength(1)
    expect(prop.temas[0].codigoOficial).toBe(40)
    expect(prop.temas[0].nome).toBe('Educação')
    expect(prop.situacao).toBe('TRAMITANDO')
    expect(prop.trust.trustLevel).toBe('L1')
    expect(prop.notification.hasErrors()).toBe(false)
  })

  it('should default situacao to DESCONHECIDA when omitted', () => {
    const prop = Proposicao.create({
      idExterno: 'senado-1',
      casa: 'SENADO',
      tipo: 'PEC',
      numero: 1,
      ano: 2025,
      ementa: 'Ementa',
      sourceUrl: 'https://example.com',
    })

    expect(prop.situacao).toBe('DESCONHECIDA')
    expect(prop.autores).toEqual([])
    expect(prop.temas).toEqual([])
    expect(prop.dataApresentacao).toBeNull()
  })

  it('should fail validation with invalid data', () => {
    const prop = ProposicaoFakeBuilder.aProposicao()
      .withIdExterno('')
      .withNumero(-1)
      .withEmenta('')
      .build()
    prop.validate()
    expect(prop.notification.hasErrors()).toBe(true)
  })

  it('should update situacao and bump updatedAt', async () => {
    const prop = ProposicaoFakeBuilder.aProposicao().build()
    const originalUpdatedAt = prop.updatedAt

    await new Promise((r) => setTimeout(r, 5))
    prop.updateSituacao('APROVADA', 'Aprovada em plenário')

    expect(prop.situacao).toBe('APROVADA')
    expect(prop.situacaoDescricao).toBe('Aprovada em plenário')
    expect(prop.updatedAt.getTime()).toBeGreaterThan(
      originalUpdatedAt.getTime(),
    )
  })

  it('should replace temas', () => {
    const prop = ProposicaoFakeBuilder.aProposicao().build()
    prop.replaceTemas([])
    expect(prop.temas).toEqual([])
  })

  it('should replace autores', () => {
    const prop = ProposicaoFakeBuilder.aProposicao().build()
    prop.replaceAutores(['Novo Autor'])
    expect(prop.autores).toEqual(['Novo Autor'])
  })

  it('should serialize to JSON', () => {
    const prop = ProposicaoFakeBuilder.aProposicao().build()
    const json = prop.toJSON()

    expect(json.proposicaoId).toBeDefined()
    expect(json.idExterno).toBe('camara-12345')
    expect(json.tipo).toBe('PL')
    expect(json.trustLevel).toBe('L1')
    expect(json.temas).toEqual([{ codigoOficial: 40, nome: 'Educação' }])
  })
})
