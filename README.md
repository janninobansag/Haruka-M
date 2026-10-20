# Haruka

Haruka is a MERN movie and series discovery platform with an installable progressive web app.

## Project layout

- `frontend/` — Vite/React web client.
- `backend/` — Express and MongoDB API.
- `frontend/docs/` — system documentation and delivery milestones.

Each service has its own dependencies and environment configuration. The PWA is served by the web client.

## Run locally

From the repository root, install the root development tool and both app packages:

```powershell
npm.cmd install
npm.cmd run install:all
```

Configure the backend before starting it. If `backend/.env` does not exist, copy `backend/.env.example` to `backend/.env`. Set `MONGODB_URI`, `JWT_SECRET`, and `TMDB_API_KEY`; the example MongoDB URI uses a local MongoDB server. Use a reachable local or Atlas database. Keep `.env` files private and out of Git. The frontend uses `http://localhost:5000/api` by default; set `VITE_API_URL` in `frontend/.env` only when your API uses a different URL.

Start the API and web client together:

```powershell
npm.cmd run dev
```

Open <http://localhost:5173>. Check API availability at <http://localhost:5000/api/health>. In PowerShell, `npm.cmd` avoids the execution-policy issue that can block the `npm` script. On macOS or Linux, use `npm` in these commands.

Run the test suites with:

```powershell
npm.cmd test --prefix backend
npm.cmd test --prefix frontend
```
