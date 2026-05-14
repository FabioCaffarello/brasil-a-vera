import { Link } from 'wouter'

const linkClass = 'text-blue-700 underline hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-zinc-800 dark:text-zinc-200">{title}</h2>
      {children}
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{children}</p>
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="mb-3 space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300 [list-style-type:disc]">{children}</ul>
}

function Li({ children }: { children: React.ReactNode }) {
  return <li>{children}</li>
}

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">
          Documentação
        </h1>
        <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
          Guia rápido para visitantes, contribuidores e desenvolvedores curiosos.
        </p>
      </header>

      <Section title="O que é o Brasil a Vera">
        <P>
          Plataforma open source de transparência política brasileira, mantida por doação e projetada para ter custo
          operacional próximo de zero. Consolida dados públicos do Legislativo (Câmara dos Deputados, Senado Federal)
          em uma interface acessível para qualquer cidadão.
        </P>
        <P>
          O slogan resume o propósito: <em>Você escolheu quem te representa. Agora veja o que ele faz.</em>
        </P>
      </Section>

      <Section title="Como navegar">
        <Ul>
          <Li><Link href="/parlamentares" className={linkClass}>/parlamentares</Link> — listagem de deputados e senadores com filtros por casa, partido e UF.</Li>
          <Li><Link href="/proposicoes" className={linkClass}>/proposicoes</Link> — proposições legislativas (PL, PEC, PLP, MPV, PDC, PRC) com tramitação detalhada.</Li>
          <Li><Link href="/votacoes" className={linkClass}>/votacoes</Link> — votações em plenário e comissões, com breakdowns por partido.</Li>
          <Li><Link href="/busca" className={linkClass}>/busca</Link> — busca full-text por nome, ementa ou referência canônica (PL 1234/2025).</Li>
          <Li>/comparar?ids=uuid1,uuid2 — comparativo lado a lado de 2-3 parlamentares.</Li>
          <Li>/partidos/SIGLA — bancada, fidelidade e temas de um partido.</Li>
        </Ul>
      </Section>

      <Section title="Fontes de dados">
        <Ul>
          <Li><strong>Câmara dos Deputados:</strong> API REST oficial (dados.camara.leg.br) — deputados, votações nominais, proposições, orientações de bancada, CEAP.</Li>
          <Li><strong>Senado Federal:</strong> API REST oficial (legis.senado.leg.br) — senadores e votações.</Li>
        </Ul>
        <P>Todos os dados brutos recebem nível L1 (fonte oficial verificada, sem transformação). Cálculos derivados são explicitamente marcados como L2, L3 ou L4.</P>
      </Section>

      <Section title="Pirâmide de Confiança">
        <P>Cada informação exibida carrega um badge de nível:</P>
        <Ul>
          <Li><strong>L1</strong> — dado bruto de API oficial, sem transformação.</Li>
          <Li><strong>L2</strong> — agregação de fontes oficiais, reproduzível (ex: total de votos por partido).</Li>
          <Li><strong>L3</strong> — cálculo derivado com fórmula aberta e auditável (ex: alinhamento partidário).</Li>
          <Li><strong>L4</strong> — estimativa ou modelo heurístico.</Li>
        </Ul>
        <P>Nenhum número aparece sem que você saiba de onde veio e como foi calculado.</P>
      </Section>

      <Section title="Limitações conhecidas">
        <Ul>
          <Li>O Senado não publica orientações de bancada em endpoint público — alinhamento partidário de senadores não é calculável.</Li>
          <Li>Cobertura de proposições é parcial — somente as ingeridas pelo pipeline de coleta.</Li>
          <Li>CEAP (gastos) cobre apenas a Câmara dos Deputados; o Senado tem regime próprio ainda não ingerido.</Li>
          <Li>Pares contraditórios exigem ementas com verbos inequívocos — cobertura cresce incrementalmente.</Li>
        </Ul>
      </Section>
    </div>
  )
}
