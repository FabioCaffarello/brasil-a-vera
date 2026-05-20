import type { Metadata } from 'next'

import {
  DocsHeader,
  ExternalLink,
  InternalLink,
  Li,
  P,
  Section,
  Ul,
} from '../_components/typography'

export const metadata: Metadata = {
  title: 'Como ler um perfil — Brasil à Vera',
  description:
    'O que cada seção do perfil parlamentar mostra, o que ainda não cobre, e como interpretar os números do Brasil à Vera.',
}

// Conteúdo derivado das tarefas do Sprint 3.0/3.0.5/3.1 que recalibraram
// o perfil parlamentar. Não duplicar números empíricos aqui (quórum, janela)
// — esses ficam em `parlamentares.ts` (fonte canônica) e são referenciados
// genericamente para não criar dois pontos de verdade.

export default function ComoLerUmPerfil() {
  return (
    <>
      <DocsHeader
        title="Como ler um perfil"
        subtitle="O que cada seção do perfil parlamentar mostra e como interpretar."
      />

      <Section title="O perfil em duas camadas">
        <P>
          O perfil de cada parlamentar é organizado em duas camadas. A primeira
          é a <strong>identidade pública</strong> — nome, casa, partido, UF,
          situação — direto da fonte oficial (L1). A segunda camada é{' '}
          <strong>comportamento legislativo</strong> — votos, alinhamento,
          afinidade, gastos — montada a partir de agregações (L2) e cálculos
          derivados (L3).
        </P>
        <P>
          Cada seção carrega um badge com o nível de confiança correspondente.
          Em caso de dúvida sobre o que cada badge significa, consulte a{' '}
          <InternalLink href="/docs/piramide-de-confianca">
            Pirâmide de Confiança
          </InternalLink>
          .
        </P>
      </Section>

      <Section title="Cabeçalho — identidade pública (L1)">
        <P>
          Nome civil, partido atual, casa (Câmara ou Senado), UF e situação (em
          exercício, licença, etc). Tudo vindo direto da API oficial.
        </P>
        <Ul>
          <Li>
            <strong>Mudança de partido</strong>: aparece o partido atual. O
            histórico de filiações está na fonte oficial linkada.
          </Li>
          <Li>
            <strong>Senado</strong>: senadores têm mandato de 8 anos, então a
            "situação" pode incluir suplência.
          </Li>
        </Ul>
      </Section>

      <Section title="Top afinidade de voto (L3)">
        <P>
          Lista os parlamentares cujos votos mais coincidem com os do perfil
          visualizado. <strong>É um cálculo L3</strong> — depende de escolhas
          editoriais documentadas.
        </P>
        <Ul>
          <Li>
            <strong>Quórum mínimo</strong>: o cálculo exige um número mínimo de
            votações comparáveis entre os dois parlamentares (mesma sessão,
            ambos votando SIM/NÃO — abstenções e ausências não contam). Pares
            com poucas votações em comum não aparecem.
          </Li>
          <Li>
            <strong>Janela temporal</strong>: olha apenas os últimos meses.
            Histórico antigo não distorce o presente.
          </Li>
          <Li>
            <strong>Empate</strong>: quando dois pares têm a mesma porcentagem
            de coincidência, o desempate é pelo número de votações comparáveis
            (mais votações = ranking mais alto).
          </Li>
          <Li>
            <strong>Limitação</strong>: afinidade alta não implica concordância
            ideológica. Dois parlamentares podem votar igual por motivos
            distintos (orientação do mesmo bloco, ausência em sessões críticas
            etc).
          </Li>
        </Ul>
      </Section>

      <Section title="Alinhamento partidário (L2)">
        <P>
          Percentual de coincidência entre o voto do parlamentar e a orientação
          da bancada do partido. Apenas votações nominais onde a bancada deu
          orientação formal (SIM/NÃO) entram na conta. ABSTENÇÕES,{' '}
          <em>LIBERADO</em> e <em>OBSTRUÇÃO</em> ficam fora.
        </P>
        <Ul>
          <Li>
            <strong>Câmara</strong>: cobertura completa. A API publica
            orientações da bancada por votação.
          </Li>
          <Li>
            <strong>Senado</strong>: empty state. A API do Senado não publica
            orientações partidárias — sem dado L1, não há L2 a calcular. Ver{' '}
            <ExternalLink href="https://github.com/FabioCaffarello/brasil-a-vera/issues/83">
              issue #83
            </ExternalLink>
            .
          </Li>
          <Li>
            <strong>Amostra mínima</strong>: parlamentares com poucos votos
            comparáveis ficam em empty state. Conforme o cron de votações
            acumula histórico, mais perfis atingem o threshold.
          </Li>
        </Ul>
      </Section>

      <Section title="Votos recentes (L1 + L2)">
        <P>
          Lista das votações nominais mais recentes em que o parlamentar esteve
          presente, com o voto registrado (SIM/NÃO/ABSTENÇÃO/AUSENTE/
          OBSTRUÇÃO). Quando a orientação da bancada foi dada, a tela mostra se
          o voto foi com ou contra o partido (L2 — comparação direta).
        </P>
        <Ul>
          <Li>
            O dado primário do voto é L1. A comparação "com/contra o partido" é
            L2 (cálculo determinístico).
          </Li>
          <Li>
            Votações simbólicas e secretas <strong>não aparecem</strong> — não
            registram voto individual.
          </Li>
        </Ul>
      </Section>

      <Section title="Proposições — autor (L1)">
        <P>
          Proposições onde o parlamentar consta como autor ou coautor, ordenadas
          por data de apresentação. Sigla, número e ementa reproduzidos da fonte
          oficial. <em>Ementa</em> é o resumo formal do projeto — não
          interpretação do Brasil à Vera.
        </P>
      </Section>

      <Section title="Gastos CEAP (L1, Câmara apenas)">
        <P>
          CEAP é a <em>Cota para Exercício da Atividade Parlamentar</em> — verba
          mensal destinada a despesas do mandato. Cada nota fiscal aparece com
          fornecedor, valor e categoria.
        </P>
        <Ul>
          <Li>
            <strong>Senado fora</strong>: o Senado não tem cota equivalente
            direta. Senadores não exibem essa seção.
          </Li>
          <Li>
            <strong>Atraso na fonte</strong>: gastos podem demorar semanas para
            aparecer na API da Câmara após a despesa real. A plataforma mostra o
            que foi publicado oficialmente.
          </Li>
        </Ul>
      </Section>

      <Section title="O que o perfil ainda não cobre">
        <Ul>
          <Li>
            <strong>Doações de campanha (TSE)</strong>: integração ainda não
            implementada. Roadmap em Wave 3.3.
          </Li>
          <Li>
            <strong>Emendas parlamentares</strong>: dado existe no Portal da
            Transparência mas ainda não foi ingerido. Wave 3+.
          </Li>
          <Li>
            <strong>Inteiro teor das proposições</strong>: o site mostra a
            ementa (resumo formal). O texto completo vive na fonte oficial.
          </Li>
          <Li>
            <strong>Substitutivos</strong>: o sistema mostra que o voto
            aconteceu, mas não diz se foi sobre o texto original ou um
            substitutivo posterior. Pode mudar o sentido cívico do voto.
          </Li>
        </Ul>
      </Section>

      <Section title="Quando o perfil mostra um vazio honesto">
        <P>
          Empty states (caixas com mensagem em vez de números) não são bugs. São
          a maneira do site dizer:{' '}
          <em>
            "este dado existe na fonte oficial mas não temos amostra suficiente
            para calcular com integridade, ou a fonte oficial não publica esse
            dado para esse caso"
          </em>
          .
        </P>
        <P>
          Mostrar um número ruim com cara de número bom é pior do que mostrar um
          vazio. O Brasil à Vera optou pelo vazio.
        </P>
      </Section>
    </>
  )
}
