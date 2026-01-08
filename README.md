# Papayal Mobile

Expo React Native app with JWT auth, refresh rotation, and a simple wallet UI.

## Getting started

1. Install deps: `npm install`
2. Set the API base URL (optional): `export EXPO_PUBLIC_API_BASE_URL="http://localhost:3000"`
3. Run: `npm start` (or `npm run ios` / `npm run android`)

Defaults point to `http://localhost:3000` for local Rails. For staging on Render, set `EXPO_PUBLIC_API_BASE_URL` accordingly before starting the app.

## Auth flow

- Login calls `/api/v1/auth/login` and stores the access token in memory and the refresh token in SecureStore.
- The HTTP client attaches `Authorization` automatically and, on `401 auth.token_expired|auth.invalid_token`, performs a single refresh via `/api/v1/auth/refresh`, rotating both tokens.
- Refresh failure clears local auth; logout hits `/api/v1/auth/logout` (or `/api/v1/auth/logout_all`) and wipes stored tokens.

## Navigation

- Auth stack: Login
- App tabs: Home, Wallet (list/detail/redemption), Profile

