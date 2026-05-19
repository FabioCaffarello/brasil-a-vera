# LGPD — Procedimento administrativo de erase de menores

> Operacional. Procedimento de resposta a solicitação de eliminação
> de dados de menor de idade.

## Quando se aplica

- Responsável legal solicita eliminação de conta de menor entre 16 e 17 anos.
- Identificada conta de menor de 16 anos (que não deveria ter criado conta).
- Responsável legal solicita eliminação de conta criada com assistência mas
  cuja autorização foi posteriormente retirada.

## Diferenças vs `/painel/meus-dados`

A interface de auto-serviço em `/painel/meus-dados` (Etapa 9.5) cobre o caso
"usuário maior de idade pede para eliminar a própria conta". Os casos acima
**não** passam por essa interface: o solicitante não é o titular dos dados, e
a identidade do solicitante (responsável legal) precisa ser verificada antes
de qualquer ação.

## Procedimento

### Passo 1 — Recepção

A solicitação chega via `lgpd@brasilavera.org` (Cloudflare Email Routing,
configurado na Etapa 9.8). O remetente deve identificar:

- Nome completo do menor e email da conta no Brasil à Vera.
- Nome completo, CPF e relação de responsabilidade legal do solicitante.
- Documento que comprove a responsabilidade legal (certidão de nascimento,
  termo de guarda, tutela judicial). Aceitar PDF anexado.

Responder confirmando recebimento e prazo de até 15 dias corridos (LGPD
art. 19 §1º).

### Passo 2 — Validação

Confirmar:

- A conta existe no `usuario.user_profile` (consulta por email).
- A data de criação da conta sugere idade compatível com a alegação (heurística;
  a LGPD não exige verificação cartorial).
- O documento anexado é coerente com o nome do menor.

Caso a validação falhe, responder ao solicitante explicando o que falta —
sem indicar se a conta existe ou não (defesa contra fishing de identidade).

### Passo 3 — Execução do erase

Executar o erase administrativo no banco. Até a Etapa 9.4 estar mergeada, o
procedimento é manual via Drizzle Studio ou `psql`:

```sql
-- 1. Localiza o user_profile
SELECT id, email, created_at, deleted_at
FROM usuario.user_profile
WHERE email = '<email-do-menor>';

-- 2. Soft delete (a partir daqui o cron diário de hard-delete da Etapa 9.6
--    elimina os dados em 30 dias; em casos sensíveis envolvendo menor,
--    pular a janela e fazer hard delete imediato — passo 4).
UPDATE usuario.user_profile
SET deleted_at = now()
WHERE id = '<uuid-do-user-profile>';

-- 3. Registro do consent_log da decisão administrativa (preserva auditoria).
INSERT INTO usuario.consent_log (
  user_id, scope, granted, legal_basis, policy_version, source, ip_hash
) VALUES (
  '<uuid-do-user-profile>',
  'erase_administrativo_menor',
  false,
  'art_18_VI_LGPD',
  -- versão corrente da política; checar src/lib/privacy.ts
  '<PRIVACY_POLICY_VERSION>',
  'lgpd_email_ticket',
  -- hash do email do solicitante (não do menor) salgado com data ISO do dia.
  encode(digest('<email-solicitante>:' || to_char(current_date, 'YYYY-MM-DD'), 'sha256'), 'hex')
);

-- 4. (Opcional, casos sensíveis) Hard delete imediato. Cascade remove
--    follows, alert_policy, alert_delivery vinculados; consent_log
--    permanece intacto (FK nullable).
DELETE FROM usuario.user_profile
WHERE id = '<uuid-do-user-profile>';
```

A partir da Etapa 9.4 mergeada existirá um endpoint `/api/admin/data-request`
que executa o mesmo fluxo programaticamente. Atualizar este documento quando
o endpoint estiver disponível.

### Passo 4 — Comunicação

Responder ao solicitante confirmando:

- Que a conta foi eliminada (ou colocada em soft delete com hard delete
  agendado em N dias, se preferir respeitar a janela padrão).
- Que o consent_log preserva apenas o registro abstrato da decisão, sem dados
  do menor.
- Que o procedimento concluiu o atendimento da solicitação.

Não enviar dados do menor por email mesmo a pedido — o canal não é seguro.

### Passo 5 — Auditoria

Salvar uma cópia do email original, do documento anexado e do registro de
ação executada em local fora do sistema, com retenção de 5 anos (prazo
prescricional de pretensão reparatória LGPD). Sugestão: pasta restrita em
storage pessoal do controlador (não dentro do repositório).

## Casos extremos

- **Solicitação anônima ou sem documento:** responder pedindo a
  documentação; não executar o erase enquanto não houver verificação.
- **Solicitação de pessoa que não é responsável legal** (parente próximo,
  por exemplo): explicar que o erase auto-serviço pelo próprio titular
  (`/painel/meus-dados`) é o caminho.
- **Suspeita de coerção do menor**: caso o conteúdo da solicitação ou da
  conversa sugira que o menor está sendo forçado a eliminar a conta contra
  sua vontade, pausar o atendimento e consultar advogado antes de executar.

## Referências

- LGPD art. 14 — tratamento de dados pessoais de crianças e adolescentes.
- LGPD art. 18 — direitos do titular.
- LGPD art. 19 — prazo de resposta.
- [`src/lib/privacy.ts`](../../src/lib/privacy.ts) — constantes
  `PRIVACY_POLICY_VERSION` e `PRIVACY_MIN_AGE_WITH_GUARDIAN`.
- [`docs/product/LOGGED-AREA-VISION.md`](../product/LOGGED-AREA-VISION.md) — §7
  (LGPD e compliance) e §8 (Etapa 9).
