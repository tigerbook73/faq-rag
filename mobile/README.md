# FAQ-RAG Mobile Demo

Expo React Native demo client for the FAQ-RAG API.

## Environment

Expo loads standard `.env` files from the `mobile/` project root.

Use this convention:

```txt
local  = .env + .env.development.local
remote = .env + .env.production
```

Create `mobile/.env` for shared defaults:

```txt
EXPO_PUBLIC_DEFAULT_PROVIDER=deepseek
```

Create `mobile/.env.development.local` for local device or simulator values:

```txt
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:3000
EXPO_PUBLIC_SUPABASE_URL=http://192.168.1.10:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_DEFAULT_PROVIDER=deepseek
```

Use a LAN IP instead of `localhost` when testing on a physical device. For remote or production bundling, create
`mobile/.env.production` with deployed API and Supabase public values.

## Run

```bash
pnpm --filter mobile start
```

The app signs in with Supabase Auth, stores the session in Expo SecureStore, and calls the Next.js API with
`Authorization: Bearer <access_token>`.
