This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/api-routes/introduction) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.ts`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/api-routes/introduction) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Stripe Webhook + Firebase Admin

Para liberar o acesso apos o pagamento, o webhook do Stripe grava a assinatura no Firestore.

Configurar no Stripe:
- Endpoint: `https://SEU_DOMINIO.vercel.app/api/webhook`
- Eventos: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`
- Copie o Signing secret para `NEXT_WEBHOOK_SECRET`

Variaveis de ambiente necessarias (Vercel e local):
- `NEXT_WEBHOOK_SECRET`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY` (cole a chave com `\n` para quebras de linha)
- ou `FIREBASE_ADMIN_PRIVATE_KEY_BASE64` (alternativa segura para evitar erro de quebra de linha)

Sem essas variaveis, o webhook nao consegue salvar a assinatura e o usuario volta para "Escolha seu plano".

## Regras do Firebase (Firestore)

As regras abaixo liberam apenas o acesso do proprio usuario aos seus dados. Sao usadas para:
- `users/{uid}`: perfil (nome, email, foto)
- `customers/{uid}`: dados de assinatura, pagamentos e checkout_sessions
- `ratings`: leitura publica, escrita do proprio usuario
- `favoritos`: leitura/escrita do proprio usuario
- Foto de perfil agora usa Supabase Storage (bucket `avatars`)

Firestore (Rules):
```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return signedIn() && request.auth.uid == userId;
    }

    // Perfil do usuario
    match /users/{userId} {
      allow read, write: if isOwner(userId);
    }

    // Dados do cliente e subcolecoes
    match /customers/{userId}/{document=**} {
      allow read, write: if isOwner(userId);
    }

    // Ratings: leitura publica, escrita do proprio usuario
    match /ratings/{ratingId} {
      allow read: if true;
      allow create, update: if signedIn() && request.resource.data.userId == request.auth.uid;
      allow delete: if signedIn() && resource.data.userId == request.auth.uid;
    }

    // Favoritos: apenas do proprio usuario
    match /favoritos/{favId} {
      allow read, create, update, delete: if signedIn()
        && request.resource.data.userId == request.auth.uid
        && (resource == null || resource.data.userId == request.auth.uid);
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

## Supabase Storage (avatar)

Crie um bucket chamado `avatars` e deixe publico.
Exemplo de policy (SQL) para leitura publica e upload autenticado:

```sql
-- leitura publica
create policy "public read avatars"
on storage.objects for select
using (bucket_id = 'avatars');

-- upload do proprio usuario (usa o uid do Firebase no nome do arquivo)
create policy "user upload avatars"
on storage.objects for insert
with check (bucket_id = 'avatars');
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
