// Versionamento da política de privacidade — Wave 10 Etapa 9.1.
//
// A versão é o identificador canônico que `consent_log.policy_version`
// referencia e que o `<ConsentGate />` (Etapa 9.3) compara contra o
// último consentimento do usuário para decidir se mostra o modal de
// re-aceite.
//
// Formato: data ISO `YYYY-MM-DD`. Versionar por data evita conflito
// com semver (que sugere compatibility) e deixa óbvio quando o texto
// foi atualizado.
//
// Regra de bump: qualquer mudança material no texto da política
// (nova finalidade, novo terceiro, mudança de retenção) requer bump.
// Correção tipográfica não requer.

export const PRIVACY_POLICY_VERSION = '2026-05-19'

/**
 * Data de vigência da versão corrente. Aparece no header da página
 * `/privacidade` e é usada para textos como "vigente desde X".
 */
export const PRIVACY_POLICY_EFFECTIVE_AT = new Date('2026-05-19T00:00:00Z')

/**
 * Endereço para titular exercer direitos LGPD (acesso, retificação,
 * eliminação, anonimização, portabilidade, revogação de consentimento).
 * Setup operacional (Cloudflare Email Routing) na Etapa 9.8.
 */
export const PRIVACY_CONTACT_EMAIL = 'lgpd@brasilavera.org'

/**
 * Idade mínima para criar conta sem assistência de responsável legal.
 * Entre 16 e 17 anos exige assistência (LGPD art. 14 §1º interpretado
 * em conjunto com Código Civil art. 4º). Abaixo de 16 não pode criar
 * conta.
 */
export const PRIVACY_MIN_AGE_WITHOUT_GUARDIAN = 18
export const PRIVACY_MIN_AGE_WITH_GUARDIAN = 16
