# Stripe configuration (painel de pagamento)

Este documento descreve como o painel de pagamento passa a buscar os dados
direto do Stripe e como o `stripeId` do cliente e atualizado automaticamente.

## Visao geral

- O frontend chama apenas a rota `GET /api/stripe-customer-summary`.
- Essa rota valida o usuario via token do Firebase.
- Se o `stripeId` salvo no Firestore estiver invalido/ausente, a rota busca
  o cliente no Stripe pelo e-mail do usuario e atualiza o `customers/{uid}`.
- Em seguida, ela retorna resumo do cartao, validade, status e proxima
  renovacao, que sao exibidos no modal de configuracoes.

## Arquivos principais

- `pages/api/stripe-customer-summary.ts`
  - Autentica o usuario com Firebase Admin.
  - Busca o cliente no Stripe pelo `stripeId` ou pelo e-mail do usuario.
  - Atualiza `customers/{uid}` com o `stripeId` correto.
  - Retorna os dados do cartao, status e renovacao.
- `lib/server/firebaseAdmin.ts`
  - Inicializa Firebase Admin (auth + firestore).
- `lib/server/stripeSummary.ts`
  - Centraliza a leitura de assinatura e cartao no Stripe.
- `components/Header.tsx`
  - Chama `GET /api/stripe-customer-summary` e exibe os dados no painel.

## Fluxo detalhado

1. O usuario abre o modal de configuracoes no header.
2. O frontend busca `GET /api/stripe-customer-summary` com o token do Firebase.
3. A rota valida o token e obtem `uid` + e-mail.
4. A rota tenta:
   - `stripeId` no Firestore (se existir);
   - caso falhe, busca o cliente no Stripe pelo e-mail.
5. Quando encontra o cliente, salva:
   - `customers/{uid}.stripeId`
   - `customers/{uid}.email`
   - `customers/{uid}.stripeLink`
6. A rota retorna:
   - cartao (brand, last4, expMonth, expYear)
   - status da assinatura
   - data de renovacao
7. O frontend exibe os valores no modal.

## Requisitos de ambiente

- `NEXT_SECRET_STRIPE_KEY` (chave do Stripe do ambiente correto: test ou live)
- Firebase Admin:
  - `FIREBASE_ADMIN_PROJECT_ID`
  - `FIREBASE_ADMIN_CLIENT_EMAIL`
  - `FIREBASE_ADMIN_PRIVATE_KEY` ou `FIREBASE_ADMIN_PRIVATE_KEY_BASE64`

Observacao: o `stripeId` precisa existir no mesmo ambiente da chave usada
(`test` ou `live`).

## Verificacao rapida

- Acesse o modal de configuracoes.
- Os campos devem mostrar valores reais:
  - Cartao, validade, status e proxima renovacao.
- Se aparecer `--`, verifique a resposta de
  `GET /api/stripe-customer-summary` na aba Network.
