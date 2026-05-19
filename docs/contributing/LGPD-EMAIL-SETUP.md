# LGPD — Setup do `lgpd@brasilavera.org` via Cloudflare Email Routing

> Operacional. Configuração do endereço de contato do encarregado (DPO)
> exposto na política de privacidade e usado para o procedimento de
> erase administrativo de menores.

## Por que Cloudflare Email Routing

- **Custo zero** dentro dos limites do free tier (10 mil emails/mês,
  500 endereços de destino) — alinhado com o princípio de operação a
  custo próximo de zero.
- **Sem servidor SMTP próprio para receber** — apenas forwarding para o
  inbox pessoal do controlador. Spam e antivírus do destino final
  (Gmail, etc.) cobrem o resto.
- **Já operamos no Cloudflare** (Workers, R2, DNS) — sem novo
  fornecedor.

Detalhes do produto:
<https://developers.cloudflare.com/email-routing/>.

## Pré-requisitos

- Domínio `brasilavera.org` administrado no Cloudflare (já feito —
  Sprint 3.1).
- Acesso ao dashboard Cloudflare com permissão de Email Routing.
- Email pessoal do controlador (Fabio Caffarello) para receber o
  forwarding.

## Passo a passo

### 1. Ativar Email Routing no domínio

1. Cloudflare Dashboard → selecionar `brasilavera.org`.
2. Sidebar → **Email** → **Email Routing**.
3. Clicar **Get started** se for a primeira ativação.
4. Cloudflare propõe ajustar registros MX e TXT (SPF) automaticamente.
   Aceitar — substitui qualquer MX manual que existisse (não tem).

### 2. Adicionar endereço de destino

1. Aba **Destination addresses** → **Add destination address**.
2. Inserir o email pessoal do controlador.
3. Cloudflare envia link de verificação para esse endereço — clicar
   antes de prosseguir.

### 3. Criar a rota `lgpd@`

1. Aba **Routing rules** → **Create address**.
2. Custom address: `lgpd@brasilavera.org`.
3. Action: **Send to an email** → escolher o destino verificado no
   passo 2.
4. Salvar.

### 4. Catch-all (opcional, recomendado)

Para evitar bounces em variações tipográficas (`lgdp@`, `privacy@`,
`dpo@`, etc.):

1. Aba **Routing rules** → seção **Catch-all address** → **Edit**.
2. Action: **Send to an email** → mesmo destino.
3. Salvar.

Cuidado: catch-all coleta spam direcionado ao domínio. Filtragem do
inbox de destino fica responsável por triagem.

### 5. Verificação DNS

Cloudflare deixa os registros prontos automaticamente, mas vale
conferir após criação:

```bash
dig +short MX brasilavera.org
# esperado: várias linhas pointing route1/2/3.mx.cloudflare.net.

dig +short TXT brasilavera.org | grep -i spf
# esperado: "v=spf1 include:_spf.mx.cloudflare.net ~all"
```

Conflito com SPF do Resend (envio de alertas) é compatível — Resend
usa um subdomínio próprio (`send.brasilavera.org`) ou um seletor DKIM
específico. Se houver SPF combinado, mesclar `include:` entries:

```
v=spf1 include:_spf.mx.cloudflare.net include:_spf.resend.com ~all
```

(Manter `~all` softfail; ANPD não exige hardfail.)

## Teste de fumaça

Logo após criar a rota:

1. De um email externo qualquer, mandar uma mensagem curta para
   `lgpd@brasilavera.org`.
2. Esperar até 5 minutos (geralmente <30s).
3. Verificar no inbox do destino — a mensagem deve aparecer com o
   `From:` do remetente externo e o `To:` original `lgpd@...`.

Se não chegar:

- Conferir aba **Routing rules** → a rota está **Active**?
- Conferir aba **Destination addresses** → o destino está
  **Verified**?
- Logs em **Email Routing** → **Logs** indicam o motivo (dropped,
  bounced, etc.).

## Resposta a solicitações

O fluxo operacional de resposta a emails que chegam em `lgpd@` está
documentado em
[`LGPD-ERASE-MENORES.md`](LGPD-ERASE-MENORES.md) (caso específico de
menores) e segue como referência geral para outros pedidos LGPD —
acesso, retificação, anonimização, eliminação, portabilidade.

Prazo de resposta: 15 dias corridos (LGPD art. 19 §1º).

## Rotação ou desativação

**Trocar o destino** (mudança de email pessoal):

1. Adicionar novo destino + verificar.
2. Editar a routing rule `lgpd@` para apontar para o novo.
3. Remover o destino antigo.

**Desativar** (caso o projeto encerre):

1. Pausar a routing rule (mantém o registro ativo, mas para de
   encaminhar).
2. Atualizar a política de privacidade para outro canal de contato.
3. Em última instância, remover Email Routing → restaura DNS sem MX
   (mas torna o domínio "sem inbox" — qualquer pedido LGPD que tente
   esse endereço bounce, o que não é aceitável enquanto a plataforma
   estiver no ar).

## Referências cruzadas

- [`src/app/privacidade/page.tsx`](../../src/app/privacidade/page.tsx)
  §11 — endereço exibido ao usuário final.
- [`src/lib/privacy.ts`](../../src/lib/privacy.ts) —
  `PRIVACY_CONTACT_EMAIL` (fonte única do endereço).
- [`docs/contributing/LGPD-ERASE-MENORES.md`](LGPD-ERASE-MENORES.md) —
  procedimento administrativo de resposta.
- [ADR-031 §Contato](../architecture/ADR/031-framework-lgpd-area-logada.md)
  — racional do `lgpd@` como ponto único de contato LGPD.
