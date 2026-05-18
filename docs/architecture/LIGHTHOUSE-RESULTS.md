# Lighthouse mobile — resultados pós-Wave 4

Template criado em: 2026-05-16 (Sprint 4.6 PR 4)
Status: ⏳ Aguardando preenchimento pelo owner
Procedimento: [`LIGHTHOUSE-PLAN.md`](./LIGHTHOUSE-PLAN.md)

## Como usar este documento

1. Executar Lighthouse mobile em produção seguindo `LIGHTHOUSE-PLAN.md`
2. 3 runs por rota (mediana)
3. Preencher as tabelas abaixo
4. Atualizar a seção "Veredito" com a decisão final
5. Fechar (ou referenciar) issue #114 com o resultado

## Ambiente da medição

| Campo | Valor |
|---|---|
| Data da execução | (preencher: YYYY-MM-DD) |
| Browser | (ex: Chrome 130.0.6723.91) |
| URL base | https://brasilavera.org |
| Conexão simulada | 4G (Lighthouse mobile preset) |
| CPU throttling | 4× slowdown |
| Modo | Incognito (sem extensões) |
| Tag testada | v0.4-final-public |

## Resultados — confirmação do baseline (#114)

| Rota | LCP | FCP | TBT | CLS | Perf | A11y | SEO | LCP element |
|---|---|---|---|---|---|---|---|---|
| `/` | _s | _s | _ms | _ | _ | _ | _ | _ |
| `/parlamentares` | _s | _s | _ms | _ | _ | _ | _ | _ |
| `/parlamentares/[id]` (escolher 1) | _s | _s | _ms | _ | _ | _ | _ | _ |
| `/partidos/[sigla]` (escolher 1) | _s | _s | _ms | _ | _ | _ | _ | _ |
| `/proposicoes` | _s | _s | _ms | _ | _ | _ | _ | _ |
| `/votacoes/[id]` (escolher 1) | _s | _s | _ms | _ | _ | _ | _ | _ |

Observações por rota:
- `/`: (livre — diagnostics relevantes)
- `/parlamentares`: 
- `/parlamentares/[id]`: (qual ID testado?)
- `/partidos/[sigla]`: (qual sigla?)
- `/proposicoes`: 
- `/votacoes/[id]`: (qual ID?)

## Resultados — rotas novas (reskinned Wave 4)

| Rota | LCP | FCP | TBT | CLS | Perf | A11y | SEO | LCP element |
|---|---|---|---|---|---|---|---|---|
| `/votacoes` (listing) | _s | _s | _ms | _ | _ | _ | _ | _ |
| `/proposicoes/[tipo]/[numero]/[ano]` | _s | _s | _ms | _ | _ | _ | _ | _ |
| `/docs` (hub) | _s | _s | _ms | _ | _ | _ | _ | _ |
| `/docs/piramide-de-confianca` | _s | _s | _ms | _ | _ | _ | _ | _ |
| `/busca?q=...` | _s | _s | _ms | _ | _ | _ | _ | _ |
| `/comparar?ids=...` | _s | _s | _ms | _ | _ | _ | _ | _ |

Observações:
- `/proposicoes/[tipo]/[numero]/[ano]`: (qual PL/PEC testado?)
- `/busca`: (qual query?)
- `/comparar`: (quais UUIDs?)

## Comparação com baseline #114

| Rota | LCP baseline (2026-05-13) | LCP agora | Δ | Status |
|---|---|---|---|---|
| `/` | 2.8s | _s | _s | (melhorou/manteve/piorou) |
| `/parlamentares` | 3.1s | _s | _s | _ |
| `/parlamentares/[id]` | 2.3s | _s | _s | _ |
| `/partidos/[sigla]` | 2.8s | _s | _s | _ |
| `/proposicoes` | 2.2s | _s | _s | _ |
| `/votacoes/[id]` | 1.6s | _s | _s | _ |

## Veredito

(Preencher uma das opções:)

### ✅ Critério atendido em todas as rotas
- Todas com LCP ≤ 2.5s, Performance ≥ 95, Accessibility = 100
- **Ação**: fechar issue #114 com link para este documento. Atualizar
  release notes `v0.4-final-public.md` com tabela. Sem PR adicional.

### ⚠️ Critério atendido na maioria, regressão isolada
- N rotas falhando, K rotas passando
- Causa raiz identificada via DevTools (preencher)
- **Ação**: abrir issue específica com label `wave-5+` + `perf`. Linkar
  este documento. Não tagear Sprint 4.6 como "completa" no critério de
  Done — registrar como carryover empírico explícito.

### ❌ Regressão ampla
- Maioria das rotas falhando
- **Ação**: Wave 4 não pode tagear `v0.4-final-public` sem investigação.
  Causa raiz primeiro, PR de fix, re-medir, então tag.

## Análise de variação (opcional, recomendado)

Single Lighthouse run tem variação. Se as métricas estão **próximas** do
threshold (LCP entre 2.3-2.7s, por exemplo), recomenda-se:

- 5 runs em vez de 3
- Calcular média + desvio padrão
- Se desvio padrão > 15% da média: investigar — pode haver hidratação
  irregular, query DB inconsistente, ou efeito de cache cold/warm

## Acessibilidade (detalhe)

Se Lighthouse a11y ≠ 100, lista exata dos audits que falharam:

- (rota): (audit ID) — (descrição curta)

Cada falha vira tarefa específica antes de fechar Wave 4.

## Notas pós-medição

(Espaço livre para observações que ajudem futuras medições — exemplos:
"Cold start do Worker adicionou 600ms em /partidos/PT primeira chamada;
runs subsequentes foram 1.4s mais rápidos", "Avatar do deputado X
travou 800ms aguardando camara.leg.br", etc.)
