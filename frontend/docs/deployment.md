# Haruka deployment guide

This guide deploys the three Haruka clients/services separately:

- MongoDB Atlas remains the database.
- Render (or another Node host) runs `backend/`.
- Vercel (or another static host) serves `frontend/`.
- The web frontend is installable as a PWA from supported browsers; its service worker caches only the app shell and never caches API responses.
- The navbar's **Install app** action opens the browser install prompt when available and explains the manual Add to Home Screen path on unsupported browsers such as iOS Safari.
- On narrow screens, the navbar collapses into a hamburger menu containing Discover, My List, Install app, and permitted Admin Studio actions.

If Brave shows “Failed to read the app data. Cannot start the app,” remove the old Haruka installed app/shortcut, clear the site's stored data, reload the HTTPS site, and install it again. The PWA manifest uses a stable `/` app ID so future updates resolve to the same installed app.
- Expo Application Services (EAS) builds and submits `mobile/`.

## Before pushing to GitHub

1. Confirm `.env` files are ignored and are not tracked by Git.
2. Rotate any MongoDB password, TMDB key, or JWT secret that has been exposed. Generate a long random production `JWT_SECRET`.
3. Use a least-privilege MongoDB database user for the deployed API.
4. Remove any unlicensed media embed before a public release. Deploy only trailers or media you are licensed to distribute.

## 1. Atlas network access

In Atlas, open **Database & Network Access → IP Access List** and allow the outbound address(es) of your API host. If the host uses dynamic outbound addresses, its provider may require a broader temporary rule; prefer fixed IPs, private networking, or a private endpoint for production. Keep TLS enabled and do not expose the database user credentials to either frontend.

## 2. Deploy the backend

Create a Render Web Service connected to the GitHub repository:

- Root directory: `backend`
- Build command: `npm install`
- Start command: `npm start`

Add these Render environment variables:

```text
NODE_ENV=production
MONGODB_URI=<your Atlas connection string>
JWT_SECRET=<long random production secret>
TMDB_API_KEY=<your TMDB API key>
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p
CLIENT_URL=https://<your-vercel-domain>
```

Do not hard-code `PORT`; Render provides it. Verify `https://<your-api-domain>/api/health` returns a healthy Haruka API response.

## 3. Deploy the web frontend

Create a Vercel project connected to the same repository:

- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`

Add this Vercel environment variable:

```text
VITE_API_URL=/api
```

The Vercel rewrite proxies `/api/*` to the Render API. Keeping web API calls same-origin allows session cookies to persist in browsers that restrict third-party cookies, including Brave. The mobile app continues using the full Render URL in `EXPO_PUBLIC_API_URL`.

After the first deployment, copy the final Vercel URL into the backend `CLIENT_URL`, then redeploy the backend. Test sign-in, approval, My List, Admin Studio, and trailer playback from the deployed web URL.

## 4. Build the mobile app

In `mobile/.env` for local testing, use the deployed API:

```text
EXPO_PUBLIC_API_URL=https://<your-api-domain>/api
```

For store builds, add the same variable to the EAS production environment, then from `mobile/` run:

```powershell
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest build --platform ios --profile production
```

For preview builds, also add `EXPO_PUBLIC_API_URL=https://<your-api-domain>/api` to the EAS Preview environment (or run the build locally with `mobile/.env`). EAS build-time variables are embedded in the binary; changing `.env` requires a new build.

Submit only after testing the production API and confirming that the app contains permitted content. EAS supports cloud builds and store submission; Android and iOS store developer accounts are separate requirements.

## Smoke-test checklist

- `GET /api/health` succeeds over HTTPS.
- Atlas connects without local-IP assumptions.
- Web discovery uses the deployed API URL.
- Web title playback requests use `VITE_API_URL` rather than a localhost fallback after a production rebuild.
- Cross-site production sessions use secure `SameSite=None` cookies so the Vercel frontend can authenticate with the Render API.
- A new member remains pending until Admin Studio approves the account.
- Admin and super-admin restrictions still apply.
- Mobile sign-in restores its SecureStore token and My List loads.
- No `.env`, password, TMDB key, or JWT secret appears in the repository or client bundle.
