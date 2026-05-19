# ADR-031: Framework LGPD para a área logada

> Brasil a Vera · Arquitetura · v0.1
> Última atualização: 2026-05-19
> Status: accepted

---

## Contexto

A área logada (Wave 10) coleta dados pessoais de cidadão brasileiro:
e-mail, nome, UF, relação de acompanhamento, configuração de comunicação.
Tudo isso é dado pessoal sob a Lei 13.709/2018 (LGPD).

LOGGED-AREA-VISION princípio 2 estabelece: **privacidade é feature, não
overhead**. Compliance LGPD entra na proposta de valor — não como caixa
marcada, e sim como diferenciação no espaço cívico-brasileiro.

ADR-022 §Tratamento de dados pessoais (LGPD) cobriu a relação operador
↔ controlador para o Clerk. Este ADR fecha o framework LGPD para os
**dados nossos** (que vivem no Postgres), endereçando:

1. **Bases legais** (art. 7º e art. 14) por tratamento.
2. **Modelo de remoção**: hard delete, soft delete, anonimização —
   qual quando.
3. **Retenção** por categoria de dado.
4. **DPO** e canal de contato.
5. **Idade mínima** e procedimento para detecção de menor.
6. **Dashboard de transparência** (`/painel/configuracoes/meus-dados`).
7. **Lembrete pré-hard-delete** (janela de reversão).

Princípios LGPD diretamente aplicáveis (art. 6º):

- **Finalidade**: tratar apenas para propósitos legítimos, específicos,
  explícitos e informados.
- **Adequação**: tratamento compatível com finalidade declarada.
- **Necessidade**: limitação ao mínimo necessário.
- **Livre acesso**: facilitação de consulta gratuita pelo titular.
- **Transparência**: informações claras, precisas e facilmente acessíveis.
- **Segurança**: medidas técnicas e administrativas aptas.
- **Prevenção**: adoção de medidas para prevenir danos.
- **Não discriminação**: impossibilidade de uso discriminatório.
- **Responsabilização e prestação de contas**: demonstração efetiva de
  conformidade.

## Decisão

### 1. Compliance robusto + dashboard `/meus-dados`

Não é compliance mínimo. Inclui:

- Base legal explícita por tratamento (tabela abaixo).
- Direitos do titular (art. 18) implementados de fato — não só listados
  na política.
- Encarregado (DPO) declarado em política de privacidade.
- Dashboard `/painel/configuracoes/meus-dados` mostrando ao titular **tudo**
  que o sistema registra sobre ele.
- `consent_log` desde o dia 1 (retroatividade em LGPD é dolorosa).

### 2. Tabela de tratamentos (bases legais e retenção)

| Dado | Finalidade | Base legal (LGPD art. 7º) | Retenção | Forma de eliminação |
|---|---|---|---|---|
| `email`, `display_name` | autenticação, comunicação de serviço | V — execução de contrato | até deleção + 30d soft | hard delete OU anonimização |
| `uf` | personalização de recomendações | V — execução de contrato | até deleção | hard delete |
| `follows` | núcleo do serviço | V — execução de contrato | até deleção | cascade |
| `alert_policy` | configuração de comunicação | V — execução de contrato | até deleção | cascade |
| `alert_delivery` | inbox + auditoria de entrega | IX — legítimo interesse | **12 meses** | expiração + cascade |
| `consent_log` | comprovação de consentimento | II — obrigação legal LGPD | **5 anos** após término | manter; user_id setado para NULL em anonimização |
| `consent_log.ip_hash` | confirmar identidade do consent sem reidentificar | II — obrigação legal | 5 anos | salt diário garante minimização |
| Marketing opt-in | comunicação fora do serviço | I — consentimento | até revogação | revogação dispara erase do flag |
| `data_request` | trilha de exercício de direitos | II — obrigação legal | 5 anos | manter |

### 3. Modelo de remoção: soft → reminder → hard | anonimização

| Modo | Quando | O que faz |
|---|---|---|
| **Soft delete** | Imediato após `data_request kind=erase` | `user_profile.deleted_at = now()`. Auth bloqueada por middleware. Mantido 30 dias para reversão. |
| **Lembrete pré-hard-delete** | 25 dias após soft delete | Email automático: "sua conta será apagada permanentemente em 5 dias; reative aqui". Idempotente via `data_request.id`. |
| **Hard delete** | 30 dias após soft delete | `DELETE FROM user_profile WHERE deleted_at < now() - interval '30 days'`. Cascade limpa follows, alert_policy, alert_delivery, data_request. |
| **Anonimização** | Alternativa ao hard delete, escolha do usuário em `/meus-dados` | Substitui `email`, `display_name`, `clerk_user_id` por hash; preserva agregados estatísticos; `consent_log.user_id` setado para NULL. |

### 4. DPO

- **Encarregado**: Fabio Caffarello (declarado em `/privacidade`).
- **Contato**: `lgpd@brasilavera.org` (placeholder; MX no Cloudflare
  Email Routing — tarefa Etapa 9).
- Substituição futura sem alteração de ADR: basta atualizar a política
  (bump `policy_version` dispara re-aceite via `consent_log`).

### 5. Idade mínima: 16 anos, sem age gate ativo

- **Termos de uso declaram**: serviço destinado a maiores de 16 anos
  (idade do voto facultativo, CF art. 14 §1º II).
- **Sem age gate no signup**: Clerk não suporta nativamente; gates
  baseados em data de nascimento são facilmente burláveis.
- **Procedimento operacional**: em detecção de cadastro de menor de 16
  (denúncia, auto-declaração, sinal nos dados) → erase administrativo +
  notificação ao email cadastrado.
- **Dados de menor não operáveis**: art. 14 LGPD exige consentimento
  parental, que não temos mecanismo para coletar. Erase é caminho único.

### 6. Dashboard `/painel/configuracoes/meus-dados`

Três blocos verticais:

1. **O que sabemos sobre você** — tabela resumo (identidade, follows N,
   política, reports últimos 12, consentimentos ativos).
2. **Exercer direitos** — 4 botões: Exportar (JSON), Pedir correção,
   Anonimizar, Apagar conta. Cada um abre modal explicando a consequência
   + cria `data_request`.
3. **Histórico de pedidos** — tabela `data_request` do usuário, mais
   recente primeiro.

Detalhamento de UX em [LOGGED-AREA-VISION §5.5 e §7](../../product/LOGGED-AREA-VISION.md#55-painelconfiguracoesmeus-dados-dashboard-lgpd).

## Alternativas Consideradas

### A. Nível de compliance

| Opção | Decisão |
|---|---|
| **Robusto + dashboard `/meus-dados`** | **ESCOLHIDO** — privacidade é feature (princípio 2 do VISION); cumprir art. 18 efetivamente é diferenciação cívica |
| Mínimo (apenas política em `/privacidade`) | Não cumpre art. 18 com efetividade operacional; expõe a sanções ANPD; contraria tese de produto |
| Mínimo + opt-in granular obrigatório | Banner LGPD agressivo prejudica conversão sem ganho de transparência real (consentimento legítimo já é base contratual, não consentimento livre) |

### B. Modelo de remoção

| Opção | Decisão |
|---|---|
| **Soft 30d + reminder 25d + hard cascade OU anonimização (escolha do titular)** | **ESCOLHIDO** — balanceia reversão (UX), cumprimento de eliminação (art. 18 VI), e preservação de comprovação de consent |
| Hard delete imediato | Sem janela de reversão; usuário que clica errado perde tudo; auditoria zerada |
| Apenas anonimização (nunca hard delete) | Não cumpre art. 18 VI ("eliminação"); titular tem direito a remoção real, não apenas pseudonimização |
| Soft delete + nunca hard | Tabela cresce indefinidamente; dado pessoal armazenado além da finalidade — viola minimização |

### C. `consent_log.user_id` após anonimização

| Opção | Decisão |
|---|---|
| **`user_id` nullable, setado para NULL em anonimização** | **ESCOLHIDO** — cumpre art. 8º §6º (comprovação retroativa de consentimento) sem reter dado pessoal do titular anonimizado |
| Cascade delete total em anonimização | Perde comprovação retroativa; expõe operador a alegação de "nunca houve consentimento" |
| Manter `user_id` com valor após anonimização | Anonimização não estaria sendo efetiva — `user_id` ainda permite cruzamento com tabelas pré-anonimização |

### D. IP em `consent_log`

| Opção | Decisão |
|---|---|
| **`ip_hash` = sha256(IP + salt diário)** | **ESCOLHIDO** — minimização (princípio LGPD); comprova "veio do mesmo IP no mesmo dia" sem permitir reidentificação retroativa |
| IP cru | Viola minimização; armazena dado pessoal além do necessário |
| Sem registrar IP | Perde sinal de "houve ato deliberado do titular" em disputa futura |

### E. Idade mínima

| Opção | Decisão |
|---|---|
| **16 anos** | **ESCOLHIDO** — alinha com voto facultativo (CF art. 14 §1º II); exclui menores de 16 onde não temos mecanismo de consent parental |
| 18 anos | Exclui adolescentes politicamente engajados (15-17) que têm direito constitucional a participação |
| 13 anos com consentimento parental (mínimo LGPD art. 14) | Exige mecanismo de consent parental verificável; fora do escopo Wave 10 |

## Consequências

### Positivas

- Compliance proativo é diferenciação no espaço cívico brasileiro
  (poucas plataformas implementam art. 18 com dashboard efetivo).
- Dashboard `/meus-dados` cumpre simultaneamente: art. 18 I (confirmação),
  II (acesso), III (correção), IV (anonimização/eliminação), V
  (portabilidade), VI (eliminação) e art. 19 (informação sobre
  compartilhamento — não compartilhamos).
- `ip_hash` com salt diário cumpre minimização sem perder auditoria.
- Soft delete + reminder + hard reduz risco de "apaguei sem querer" em
  produto cívico (perda de relação cívica é fricção real).
- Política versionada (`policy_version`) garante que mudança força
  re-aceite — sem ambiguidade sobre "qual versão o usuário consentiu".

### Negativas

- Operação manual de erase administrativo de menores exige processo
  documentado (procedimento operacional na Etapa 9). Sem automação na
  Wave 10.
- Anonimização vs eliminação tem diferença sutil que **exige parecer
  legal** antes de v0.10.0 (questão aberta em
  [LOGGED-AREA-VISION §9](../../product/LOGGED-AREA-VISION.md#9-riscos-e-questões-abertas)).
- Tempo de desenvolvimento da Etapa 9 é o maior do plano (2 sprints) —
  compliance robusto custa mais que mínimo.
- DKIM/SPF/DMARC do domínio precisam estar perfeitos antes do primeiro
  email de erase reminder — fricção operacional na Etapa 7→9.

### Neutras

- Política de privacidade vive em `/privacidade` SSG. Mudança bump
  `policy_version`, força re-aceite, gera nova linha em `consent_log`.
  Padrão padrão.
- DPO declarado é Fabio Caffarello — substituição futura por terceiro
  (advogado, etc.) sem alteração deste ADR.
- Dataset `consent_log` cresce ~5 linhas/usuário/ano (signup, mudanças
  de política, opt-ins de marketing) — volume desprezível para Postgres
  por 5+ anos no horizonte Wave 10.

## Referências

- [LOGGED-AREA-VISION §7 (LGPD e compliance)](../../product/LOGGED-AREA-VISION.md#7-lgpd-e-compliance)
- LGPD Lei 13.709/2018 — `https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm`
  - Art. 6º (princípios), 7º (bases legais), 8º (consentimento), 14
    (dados de crianças e adolescentes), 16 (eliminação), 18 (direitos
    do titular), 41 (encarregado)
- CF/88 art. 14 §1º II (voto facultativo aos 16)
- [ADR-022 §Tratamento de dados pessoais (LGPD)](022-clerk-para-autenticacao.md) — precedente para data processor US-based (Clerk)
- [ADR-029 — Modelo de dados da área logada](029-modelo-dados-area-logada-e-topologia-auth.md) — esquema das tabelas referenciadas aqui
- [ADR-030 — Sistema de alertas e Resend](030-sistema-alertas-e-resend.md) — `alert_delivery` retenção e `lgpd@` no Cloudflare Email Routing
