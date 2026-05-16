## O que muda

<!-- 1-3 parágrafos descritivos. Para mudanças visuais, anexar screenshot antes/depois. -->

## Tipo de mudança

- [ ] Design system (primitiva nova, refactor de primitiva, token novo)
- [ ] Apresentação (componente, rota, copy)
- [ ] Domínio (query, módulo, schema, ingestão)
- [ ] Infraestrutura (.claude/, .github/, config, deploy)
- [ ] Documentação (ADR, docs/, release notes)

## Checklist

- [ ] `npm run check` passou local
- [ ] `npm run test` passou local
- [ ] `npm run build` passou local
- [ ] Trust level correto em qualquer dado novo
- [ ] Sem import cruzado entre módulos (verificado pela CI)
- [ ] Sem lógica de negócio em pages (apenas em modules/services)
- [ ] Sem dados fictícios em produção
- [ ] Sem segredo em arquivo versionado

## Para mudanças em design system / apresentação

- [ ] `/design-token-check` passou (zero zinc legacy / HEX inline)
- [ ] `/visual-qa` executado em local (screenshot antes/depois anexado)
- [ ] Renderizado em `/dev/design` se primitiva nova
- [ ] WCAG AA mantido (contraste validado se cores novas)
- [ ] Mobile 360px viewport OK

## Para mudanças em domínio / ingestão

- [ ] Bundle delta documentado se dependência nova
- [ ] `EXPLAIN ANALYZE` anexado se índice novo (princípio 10)
- [ ] Idempotência verificada se script de ingestão (princípio 5)

## Para mudanças em `.claude/`

- [ ] Hook testado em ambos os roles (designer + engineer)
- [ ] Skill testada em sessão real, output literal copiado na descrição
- [ ] Bypass de role documentado se aplicável

## Referências

<!-- Link issues fechadas, ADRs criados/alterados, PRs relacionados -->
- Closes #
- Relaciona com #
- ADR: docs/architecture/ADR/0XX-...
