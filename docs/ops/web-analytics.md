# Runbook — Cloudflare Web Analytics (instrumentação de uso)

> Status: integração **inerte** em produção até ativação explícita.
> Contexto: item 0 do plano de produto ("parar de adivinhar"). Ver
> `docs/product/METRICS.md` §Engajamento.

## O que é

Beacon do **Cloudflare Web Analytics** — métricas de acesso agregadas
(pageviews, referrer, país, device, Core Web Vitals) **cookieless**, sem PII
e **sem rastreamento cruzado de usuário**. Escolhido em vez de Google
Analytics/Plausible por ser privacy-first, gratuito e nativo do Cloudflare
(já é nosso runtime). Base legal LGPD: legítimo interesse em métricas
agregadas não identificáveis (ADR-031 §bases legais).

## Estado atual (sem ativação)

O beacon só renderiza quando `NEXT_PUBLIC_CF_BEACON_TOKEN` está presente no
build (`src/app/layout.tsx`, gated). Sem o token:

- nenhum `<script>` de terceiro vai ao HTML — o path anônimo continua limpo;
- a política de privacidade (`/privacidade`) permanece **fiel** ("não há
  fornecedores de analytics").

Por isso o código pode ser mergeado com segurança: **nada acontece** até os
passos abaixo.

## Ativação (decisão do owner — muda uma promessa pública)

> ⚠️ Ativar o analytics **muda a política de privacidade** (a Seção 5 hoje diz
> "não há fornecedores de analytics"). Os passos 2 e 3 são **inseparáveis**: não
> ative o beacon sem atualizar a política no mesmo deploy.

1. **Criar o site no Cloudflare** → painel Cloudflare → *Web Analytics* → *Add
   a site* (modo beacon/JS, domínio `brasilavera.org`). Copiar o **token**.
2. **Atualizar a política** (`src/app/privacidade/page.tsx`):
   - Seção 5 (Terceiros): incluir "Cloudflare Web Analytics — métricas de
     acesso agregadas (página, referrer, país, device), sem cookies e sem
     rastreamento cruzado".
   - Seção 8 (Cookies): permanece verdadeira (o beacon é cookieless) — não
     remover "não usamos cookies de analytics".
   - Bump da versão da política (`PRIVACY_POLICY_VERSION` em `src/lib/privacy.ts`).
3. **Adicionar o secret** no GitHub: `NEXT_PUBLIC_CF_BEACON_TOKEN` (= token do
   passo 1). É público por design (vai no HTML) — usar secret só por higiene.
   `gh secret set NEXT_PUBLIC_CF_BEACON_TOKEN`.
4. **Deploy**: o `deploy.yml` já injeta a var no `cf:build` (Next inlina
   `NEXT_PUBLIC_*` em build-time). Merge/deploy na `main`.
5. **Verificar**: `curl -s https://brasilavera.org | grep beacon.min.js`
   retorna o script; o painel Web Analytics começa a mostrar tráfego em poucos
   minutos.

## Desativação

Remover o secret `NEXT_PUBLIC_CF_BEACON_TOKEN` + redeploy → beacon some.
Reverter a Seção 5 da política + bump de versão.

## Primeiras perguntas a responder com o dado (≥2-4 semanas)

Quem realmente está lá (device, referrer), rotas mais vistas, profundidade de
scroll no perfil, e se há retorno — para validar (ou refutar) a persona
"Cidadão Consciente" antes de investir nas ondas seguintes do plano.
