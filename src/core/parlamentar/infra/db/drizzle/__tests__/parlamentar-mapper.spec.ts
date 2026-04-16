import { describe, expect, it } from 'vitest'
import { DateRange } from '@/core/shared/domain/value-objects/date-range.vo'
import { FiliacaoPartidaria } from '../../../../domain/filiacao-partidaria.entity'
import { FrenteParlamentar } from '../../../../domain/frente-parlamentar.entity'
import { Mandato } from '../../../../domain/mandato.entity'
import { MembroComissao } from '../../../../domain/membro-comissao.entity'
import { ParlamentarFakeBuilder } from '../../../../domain/parlamentar-fake.builder'
import { Legislatura } from '../../../../domain/value-objects/legislatura.vo'
import { ParlamentarId } from '../../../../domain/value-objects/parlamentar-id.vo'
import { Partido } from '../../../../domain/value-objects/partido.vo'
import { toDomain, toPersistence } from '../parlamentar-mapper'

describe('ParlamentarMapper', () => {
  const fixedId = new ParlamentarId('550e8400-e29b-41d4-a716-446655440000')
  const fixedDate = new Date('2024-01-15T00:00:00.000Z')

  function buildFullParlamentar() {
    const parlamentar = ParlamentarFakeBuilder.aParlamentar()
      .withParlamentarId(fixedId)
      .withIdExterno('12345')
      .withNome('João da Silva')
      .withNomeCivil('João Batista da Silva')
      .withCpf('12345678901')
      .withUf('SP')
      .withPartido('PT', 'Partido dos Trabalhadores')
      .withCasa('CAMARA')
      .build()

    parlamentar.createdAt = fixedDate
    parlamentar.updatedAt = fixedDate

    parlamentar.addMandato(
      new Mandato({
        legislatura: new Legislatura(
          57,
          new DateRange(
            new Date('2023-01-01T00:00:00.000Z'),
            new Date('2027-01-31T00:00:00.000Z'),
          ),
        ),
        periodo: new DateRange(
          new Date('2023-01-01T00:00:00.000Z'),
          new Date('2027-01-31T00:00:00.000Z'),
        ),
        situacao: 'EXERCICIO',
      }),
    )

    parlamentar.addFiliacao(
      new FiliacaoPartidaria(
        new Partido('PT', 'Partido dos Trabalhadores'),
        new DateRange(new Date('2020-03-15T00:00:00.000Z')),
      ),
    )

    parlamentar.addComissao(
      new MembroComissao(
        'CCJC',
        'Comissão de Constituição e Justiça',
        'TITULAR',
        new DateRange(new Date('2023-02-01T00:00:00.000Z')),
      ),
    )

    parlamentar.addFrente(
      new FrenteParlamentar(
        'FP001',
        'Frente Parlamentar da Educação',
        'COORDENADOR',
      ),
    )

    return parlamentar
  }

  describe('toPersistence', () => {
    it('should convert a full aggregate to persistence format', () => {
      const parlamentar = buildFullParlamentar()
      const data = toPersistence(parlamentar)

      expect(data.parlamentar.id).toBe(fixedId.id)
      expect(data.parlamentar.idExterno).toBe('12345')
      expect(data.parlamentar.nome).toBe('João da Silva')
      expect(data.parlamentar.nomeCivil).toBe('João Batista da Silva')
      expect(data.parlamentar.cpf).toBe('12345678901')
      expect(data.parlamentar.uf).toBe('SP')
      expect(data.parlamentar.partidoSigla).toBe('PT')
      expect(data.parlamentar.partidoNome).toBe('Partido dos Trabalhadores')
      expect(data.parlamentar.casa).toBe('CAMARA')
      expect(data.parlamentar.trustLevel).toBe('L1')
      expect(data.parlamentar.sourceUrl).toBe(
        'https://dadosabertos.camara.leg.br',
      )

      expect(data.mandatos).toHaveLength(1)
      expect(data.mandatos[0].legislaturaNumero).toBe(57)
      expect(data.mandatos[0].periodoInicio).toBe('2023-01-01')
      expect(data.mandatos[0].periodoFim).toBe('2027-01-31')
      expect(data.mandatos[0].situacao).toBe('EXERCICIO')
      expect(data.mandatos[0].parlamentarId).toBe(fixedId.id)

      expect(data.filiacoes).toHaveLength(1)
      expect(data.filiacoes[0].partidoSigla).toBe('PT')
      expect(data.filiacoes[0].periodoInicio).toBe('2020-03-15')
      expect(data.filiacoes[0].periodoFim).toBeNull()

      expect(data.comissoes).toHaveLength(1)
      expect(data.comissoes[0].comissaoId).toBe('CCJC')
      expect(data.comissoes[0].tipo).toBe('TITULAR')

      expect(data.frentes).toHaveLength(1)
      expect(data.frentes[0].frenteId).toBe('FP001')
      expect(data.frentes[0].tipo).toBe('COORDENADOR')
    })

    it('should handle empty child collections', () => {
      const parlamentar = ParlamentarFakeBuilder.aParlamentar().build()
      const data = toPersistence(parlamentar)

      expect(data.mandatos).toHaveLength(0)
      expect(data.filiacoes).toHaveLength(0)
      expect(data.comissoes).toHaveLength(0)
      expect(data.frentes).toHaveLength(0)
    })
  })

  describe('toDomain', () => {
    it('should reconstruct aggregate from DB rows', () => {
      const parlamentarRow = {
        id: fixedId.id,
        idExterno: '12345',
        nome: 'João da Silva',
        nomeCivil: 'João Batista da Silva',
        cpf: '12345678901',
        uf: 'SP',
        partidoSigla: 'PT',
        partidoNome: 'Partido dos Trabalhadores',
        urlFoto: 'https://example.com/foto.jpg',
        casa: 'CAMARA',
        trustLevel: 'L1',
        sourceUrl: 'https://dadosabertos.camara.leg.br',
        createdAt: fixedDate,
        updatedAt: fixedDate,
      }

      const mandatoRows = [
        {
          id: '660e8400-e29b-41d4-a716-446655440001',
          parlamentarId: fixedId.id,
          legislaturaNumero: 57,
          periodoInicio: '2023-01-01',
          periodoFim: '2027-01-31',
          situacao: 'EXERCICIO',
        },
      ]

      const filiacaoRows = [
        {
          id: '770e8400-e29b-41d4-a716-446655440001',
          parlamentarId: fixedId.id,
          partidoSigla: 'PT',
          partidoNome: 'Partido dos Trabalhadores',
          periodoInicio: '2020-03-15',
          periodoFim: null,
        },
      ]

      const comissaoRows = [
        {
          id: '880e8400-e29b-41d4-a716-446655440001',
          parlamentarId: fixedId.id,
          comissaoId: 'CCJC',
          nomeComissao: 'Comissão de Constituição e Justiça',
          tipo: 'TITULAR',
          periodoInicio: '2023-02-01',
          periodoFim: null,
        },
      ]

      const frenteRows = [
        {
          id: '990e8400-e29b-41d4-a716-446655440001',
          parlamentarId: fixedId.id,
          frenteId: 'FP001',
          titulo: 'Frente Parlamentar da Educação',
          tipo: 'COORDENADOR',
        },
      ]

      const entity = toDomain(
        parlamentarRow,
        mandatoRows,
        filiacaoRows,
        comissaoRows,
        frenteRows,
      )

      expect(entity.parlamentarId.id).toBe(fixedId.id)
      expect(entity.nome).toBe('João da Silva')
      expect(entity.uf).toBe('SP')
      expect(entity.partidoAtual.sigla).toBe('PT')
      expect(entity.casa).toBe('CAMARA')
      expect(entity.trust.trustLevel).toBe('L1')

      expect(entity.mandatos).toHaveLength(1)
      expect(entity.mandatos[0].legislatura.numero).toBe(57)
      expect(entity.mandatos[0].situacao).toBe('EXERCICIO')

      expect(entity.filiacoes).toHaveLength(1)
      expect(entity.filiacoes[0].partido.sigla).toBe('PT')
      expect(entity.filiacoes[0].periodo.end).toBeNull()

      expect(entity.comissoes).toHaveLength(1)
      expect(entity.comissoes[0].comissaoId).toBe('CCJC')
      expect(entity.comissoes[0].tipo).toBe('TITULAR')

      expect(entity.frentes).toHaveLength(1)
      expect(entity.frentes[0].frenteId).toBe('FP001')
    })

    it('should handle empty child rows', () => {
      const parlamentarRow = {
        id: fixedId.id,
        idExterno: '12345',
        nome: 'Test',
        nomeCivil: null,
        cpf: null,
        uf: 'SP',
        partidoSigla: 'PT',
        partidoNome: 'PT',
        urlFoto: null,
        casa: 'CAMARA',
        trustLevel: 'L1',
        sourceUrl: 'https://example.com',
        createdAt: fixedDate,
        updatedAt: fixedDate,
      }

      const entity = toDomain(parlamentarRow, [], [], [], [])

      expect(entity.mandatos).toHaveLength(0)
      expect(entity.filiacoes).toHaveLength(0)
      expect(entity.comissoes).toHaveLength(0)
      expect(entity.frentes).toHaveLength(0)
      expect(entity.nomeCivil).toBeNull()
      expect(entity.cpf).toBeNull()
    })
  })

  describe('round-trip', () => {
    it('should produce equivalent entity after toPersistence → toDomain', () => {
      const original = buildFullParlamentar()
      const persisted = toPersistence(original)

      const reconstructed = toDomain(
        { ...persisted.parlamentar } as Parameters<typeof toDomain>[0],
        persisted.mandatos as Parameters<typeof toDomain>[1],
        persisted.filiacoes.map((f) => ({
          ...f,
          id: '00000000-0000-0000-0000-000000000000',
        })) as Parameters<typeof toDomain>[2],
        persisted.comissoes.map((c) => ({
          ...c,
          id: '00000000-0000-0000-0000-000000000000',
        })) as Parameters<typeof toDomain>[3],
        persisted.frentes.map((f) => ({
          ...f,
          id: '00000000-0000-0000-0000-000000000000',
        })) as Parameters<typeof toDomain>[4],
      )

      expect(reconstructed.parlamentarId.id).toBe(original.parlamentarId.id)
      expect(reconstructed.nome).toBe(original.nome)
      expect(reconstructed.uf).toBe(original.uf)
      expect(reconstructed.partidoAtual.sigla).toBe(original.partidoAtual.sigla)
      expect(reconstructed.casa).toBe(original.casa)
      expect(reconstructed.trust.trustLevel).toBe(original.trust.trustLevel)
      expect(reconstructed.mandatos).toHaveLength(original.mandatos.length)
      expect(reconstructed.filiacoes).toHaveLength(original.filiacoes.length)
      expect(reconstructed.comissoes).toHaveLength(original.comissoes.length)
      expect(reconstructed.frentes).toHaveLength(original.frentes.length)
    })
  })
})
