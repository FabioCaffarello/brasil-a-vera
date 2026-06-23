// Política de Privacidade — Wave 10 Etapa 9.1; promovida ao RDS
// (primeira promoção da migração strangler-fig, ADR-033). Consome o
// design system @fabio.caffarello/react-design-system — tokens
// traduzidos pela tabela canônica (docs/migration/token-map.md).
//
// Página pública. Versão do texto vive em `src/lib/privacy.ts`
// (`PRIVACY_POLICY_VERSION`). Bump da constante = bump do texto.
//
// `force-dynamic` (e não `force-static`) por coerência com o resto
// do app: `<Navbar>` no root layout renderiza `<AuthSlot>` que chama
// `auth()`, o que exige clerkMiddleware em runtime — prerender no
// build falha por inexistência desse contexto. O conteúdo desta
// página é puro (sem DB, sem auth), então a "dinamicidade" é
// nominal e bem servida pelo cache de edge.
//
// O chrome (Navbar + Footer + Toaster + skip-link) vem do root layout
// `src/app/layout.tsx` por composição nested — NÃO importar aqui.

import { Text } from '@fabio.caffarello/react-design-system/server'
import type { Metadata } from 'next'
import Link from 'next/link'

import {
  PRIVACY_CONTACT_EMAIL,
  PRIVACY_MIN_AGE_WITH_GUARDIAN,
  PRIVACY_MIN_AGE_WITHOUT_GUARDIAN,
  PRIVACY_POLICY_EFFECTIVE_AT,
  PRIVACY_POLICY_VERSION,
} from '@/lib/privacy'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Política de Privacidade — Brasil à Vera',
  description:
    'Como o Brasil à Vera coleta, usa, retém e protege dados pessoais. Direitos do titular, bases legais, terceiros envolvidos e procedimentos de contato.',
}

function formatEffectiveDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// h2 permanece HTML cru: 3 propriedades de typography (font-semibold +
// text-xl + tracking-tight) — nenhum variant cobre sem 2+ overrides.
function Section({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-10" id={id}>
      <h2 className="mb-3 font-semibold text-fg-primary text-xl tracking-tight">
        {title}
      </h2>
      <div className="space-y-3 text-base text-fg-primary leading-relaxed">
        {children}
      </div>
    </section>
  )
}

function ContactLink() {
  return (
    <a
      className="text-fg-brand underline underline-offset-2 transition-colors duration-150 hover:text-fg-brand/80"
      href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
    >
      {PRIVACY_CONTACT_EMAIL}
    </a>
  )
}

export default function PrivacidadePage() {
  const effective = formatEffectiveDate(PRIVACY_POLICY_EFFECTIVE_AT)

  return (
    <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
      <header className="mb-10 border-line-default border-b pb-6">
        <h1 className="font-semibold text-3xl text-fg-primary tracking-tight sm:text-4xl">
          Política de Privacidade
        </h1>
        <Text variant="body" className="mt-2 text-fg-tertiary">
          Versão <code className="font-mono">{PRIVACY_POLICY_VERSION}</code> ·
          vigente desde {effective}
        </Text>
        <Text variant="bodySmall" className="mt-3 text-fg-tertiary">
          Este documento descreve como o Brasil à Vera trata dados pessoais nos
          termos da Lei Geral de Proteção de Dados (Lei 13.709/2018, LGPD).
        </Text>
      </header>

      <Section id="controlador" title="1. Controlador dos dados">
        <p>
          O Brasil à Vera é um projeto pessoal de transparência política mantido
          por Fabio Caffarello sob licença PolyForm Noncommercial 1.0.0. O
          controlador é uma pessoa física, e não uma organização constituída.
          Para qualquer assunto relacionado a dados pessoais, o contato é{' '}
          <ContactLink />.
        </p>
      </Section>

      <Section id="dados-coletados" title="2. Dados pessoais tratados">
        <p>
          Visitantes anônimos navegam sem coleta de dados pessoais. Usuários
          autenticados têm os seguintes dados tratados:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <strong>Email e identidade Clerk:</strong> usados para autenticar e
            entregar reports semanais por email.
          </li>
          <li>
            <strong>Nome de exibição (opcional) e UF de interesse:</strong>{' '}
            usados para personalizar saudação e recomendações regionais.
          </li>
          <li>
            <strong>Parlamentares acompanhados:</strong> compõem o conteúdo dos
            reports.
          </li>
          <li>
            <strong>Preferências de comunicação e temas de interesse:</strong>{' '}
            decidem o que entra no report.
          </li>
          <li>
            <strong>Histórico de entregas (alertas enviados e lidos):</strong>{' '}
            usado para auditoria e para evitar duplicação.
          </li>
          <li>
            <strong>Hash de endereço IP no momento do consentimento:</strong>{' '}
            armazenamos um hash SHA-256, não o IP em claro. Comprova a
            existência do consentimento sem permitir reidentificação posterior.
          </li>
        </ul>
        <p>
          Não coletamos dados sensíveis (LGPD art. 5º, II): nada sobre origem
          racial ou étnica, convicção religiosa, opinião política filiada,
          saúde, vida sexual, dado genético ou biométrico.
        </p>
      </Section>

      <Section id="finalidades" title="3. Finalidades do tratamento">
        <ul className="ml-5 list-disc space-y-1">
          <li>Permitir o login e a manutenção da conta na área autenticada.</li>
          <li>
            Produzir e entregar os reports semanais de atividade dos
            parlamentares que você acompanha.
          </li>
          <li>
            Personalizar recomendações de parlamentares com base na UF indicada.
          </li>
          <li>
            Coletar métricas agregadas de acesso (página, referrer, país,
            dispositivo) para avaliar a saúde e a adoção da plataforma, sem
            identificar o titular.
          </li>
          <li>
            Manter prova auditável do consentimento prestado, atendendo ao
            princípio da responsabilização (LGPD art. 6º, X).
          </li>
        </ul>
      </Section>

      <Section id="bases-legais" title="4. Bases legais">
        <p>
          As finalidades acima se apoiam nas seguintes bases (LGPD art. 7º):
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <strong>Consentimento (I):</strong> envio dos reports semanais e
            comunicações relacionadas.
          </li>
          <li>
            <strong>Execução de contrato com o titular (V):</strong> manter o
            cadastro funcional e disponibilizar a área autenticada.
          </li>
          <li>
            <strong>Cumprimento de obrigação legal/regulatória (II):</strong>{' '}
            preservar logs de consentimento mesmo após a anonimização da conta.
          </li>
          <li>
            <strong>Legítimo interesse (IX):</strong> métricas agregadas de uso
            do produto, em formato não identificável.
          </li>
        </ul>
      </Section>

      <Section id="terceiros" title="5. Terceiros envolvidos">
        <p>
          Operamos sobre serviços de terceiros que tratam dados pessoais em
          nosso nome ou como controladores próprios:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>
            <strong>Clerk</strong> (autenticação) — armazena credenciais e
            metadados de sessão.
          </li>
          <li>
            <strong>Neon</strong> (banco PostgreSQL) — armazena os dados
            descritos na seção 2.
          </li>
          <li>
            <strong>Resend</strong> (envio de email) — recebe email, assunto e
            corpo do report no momento do disparo.
          </li>
          <li>
            <strong>Cloudflare</strong> (Workers, R2 e Email Routing) — executa
            o código da aplicação, hospeda exports de dados solicitados pelo
            titular e roteia o endereço <ContactLink />.
          </li>
          <li>
            <strong>Cloudflare Web Analytics</strong> (métricas de acesso) —
            coleta métricas agregadas de uso (página, referrer, país,
            dispositivo), <strong>sem cookies</strong> e sem rastreamento
            cruzado de usuário.
          </li>
        </ul>
        <p>
          Não vendemos, alugamos nem compartilhamos dados para fins de
          publicidade. As métricas de uso são agregadas e não identificáveis —
          sem ad-tech nem enriquecimento de perfil.
        </p>
      </Section>

      <Section id="retencao" title="6. Retenção e eliminação">
        <p>
          Dados são mantidos enquanto a conta estiver ativa. Ao solicitar
          eliminação, sua conta entra em um período de 30 dias durante o qual
          ela continua recuperável; após esse período os dados são apagados de
          forma permanente. Você recebe um lembrete por email aos 25 dias.
        </p>
        <p>
          A anonimização (LGPD art. 16) é alternativa à eliminação: preserva
          histórico legítimo (logs de consentimento, registros agregados) sem
          identificar o titular.
        </p>
      </Section>

      <Section id="direitos" title="7. Direitos do titular">
        <p>
          Como titular, você pode, a qualquer momento, exercer os direitos
          previstos no art. 18 da LGPD:
        </p>
        <ul className="ml-5 list-disc space-y-1">
          <li>Confirmação da existência de tratamento e acesso aos dados.</li>
          <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
          <li>Anonimização, bloqueio ou eliminação.</li>
          <li>
            Portabilidade — exportação dos seus dados em formato estruturado
            (JSON).
          </li>
          <li>Revogação do consentimento.</li>
        </ul>
        <p>
          A maioria desses direitos pode ser exercida diretamente em{' '}
          <Link
            className="text-fg-brand underline underline-offset-2 transition-colors duration-150 hover:text-fg-brand/80"
            href="/painel?tab=meus-dados"
          >
            /painel?tab=meus-dados
          </Link>
          . Para os demais, escreva para <ContactLink />.
        </p>
      </Section>

      <Section id="cookies" title="8. Cookies e tecnologias similares">
        <p>
          Usamos exclusivamente cookies estritamente necessários para
          autenticação (Clerk) e preferências de navegação (tema claro/escuro).
          Não usamos cookies de marketing nem cookies de analytics — nossas
          métricas de acesso (Cloudflare Web Analytics) são cookieless, sem
          cookies de rastreamento. Por esse motivo, não exibimos banner de
          cookies — a LGPD dispensa o opt-in para tratamentos necessários à
          execução do contrato com o titular e para o legítimo interesse em
          métricas agregadas não identificáveis.
        </p>
      </Section>

      <Section id="menores" title="9. Crianças e adolescentes">
        <p>
          O Brasil à Vera é destinado a maiores de{' '}
          {PRIVACY_MIN_AGE_WITHOUT_GUARDIAN} anos. Adolescentes entre{' '}
          {PRIVACY_MIN_AGE_WITH_GUARDIAN} e{' '}
          {PRIVACY_MIN_AGE_WITHOUT_GUARDIAN - 1} anos podem usar a plataforma
          com assistência expressa de um dos responsáveis legais. Menores de{' '}
          {PRIVACY_MIN_AGE_WITH_GUARDIAN} anos não devem criar conta.
        </p>
        <p>
          Caso seja identificada conta de menor sem a devida assistência, ou
          caso responsável legal solicite eliminação dos dados de um menor, o
          tratamento é interrompido e a conta eliminada por procedimento
          administrativo. Detalhes técnicos do procedimento em{' '}
          <a
            className="text-fg-brand underline underline-offset-2 transition-colors duration-150 hover:text-fg-brand/80"
            href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/docs/contributing/LGPD-ERASE-MENORES.md"
            rel="noopener noreferrer"
            target="_blank"
          >
            docs/contributing/LGPD-ERASE-MENORES.md
          </a>
          . Para acionar o procedimento, escreva para <ContactLink />.
        </p>
      </Section>

      <Section id="alteracoes" title="10. Alterações desta política">
        <p>
          Esta política é versionada. A versão corrente aparece no cabeçalho
          desta página e em cada email transacional. Quando atualizamos o texto
          de forma material, usuários autenticados são solicitados a aceitar a
          nova versão no próximo acesso à área logada (sem isso, o acesso é
          bloqueado e o usuário pode optar por sair). Versões anteriores ficam
          preservadas no histórico do repositório público.
        </p>
      </Section>

      <Section id="contato" title="11. Contato e encarregado">
        <p>
          Para qualquer dúvida, solicitação ou exercício de direito previsto na
          LGPD, escreva para <ContactLink />. Respondemos em até 15 dias
          corridos (LGPD art. 19, §1º).
        </p>
        <p>
          A ANPD é a autoridade competente para receber reclamações sobre
          tratamento indevido de dados:{' '}
          <a
            className="text-fg-brand underline underline-offset-2 transition-colors duration-150 hover:text-fg-brand/80"
            href="https://www.gov.br/anpd/"
            rel="noopener noreferrer"
            target="_blank"
          >
            www.gov.br/anpd
          </a>
          .
        </p>
      </Section>

      <footer className="mt-12 border-line-default border-t pt-6 text-fg-tertiary text-sm">
        Versão <code className="font-mono">{PRIVACY_POLICY_VERSION}</code> ·
        vigente desde {effective} · texto-fonte em{' '}
        <a
          className="text-fg-brand underline underline-offset-2 transition-colors duration-150 hover:text-fg-brand/80"
          href="https://github.com/FabioCaffarello/brasil-a-vera/blob/main/src/app/privacidade/page.tsx"
          rel="noopener noreferrer"
          target="_blank"
        >
          GitHub
        </a>
        .
      </footer>
    </main>
  )
}
