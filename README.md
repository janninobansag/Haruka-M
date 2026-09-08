# Haruka

Haruka is a MERN movie and series discovery platform with a web client and native mobile companion.

## Project layout

- `frontend/` — Vite/React web client.
- `mobile/` — Expo/React Native mobile companion.
- `backend/` — Express and MongoDB API.
- `frontend/docs/` — system documentation and delivery milestones.

Each application has its own dependencies and environment configuration.

## Run the web app

```powershell
npm run dev
```

## Run the mobile app

Configure `mobile/.env` from `mobile/.env.example`, then run:

```powershell
npm run dev:mobile
```

The mobile app currently provides native discovery rails, title details, and official trailer links through the public Haruka API. Native sign-in, My List, and administrative tools require a secure mobile-token flow and are planned next.
