# Repository Guidelines

## Project Structure & Module Organization

`frontend/` contains the Vite/React client: pages and reusable UI live in `src/App.jsx` and `src/components/`, API calls in `src/services/api.js`, styles in `src/styles/`, and PWA assets in `public/`. `backend/` contains the Express API: route handlers in `src/routes/`, Mongoose schemas in `src/models/`, integrations in `src/services/`, and database and authentication setup in `src/config/` and `src/middleware/`. Update `frontend/docs/` when changing architecture, deployment, or milestones.

## Build, Test, and Development Commands

- `npm install` at the repository root installs the `concurrently` development helper.
- `npm run install:all` installs dependencies in both packages.
- `npm run dev` starts the API and web client together; their defaults are ports 5000 and 5173.
- `npm run build --prefix frontend` creates the production client in `frontend/dist/`.
- `npm start --prefix backend` runs the API without watch mode; `npm run preview --prefix frontend` previews a built client.

## Coding Style & Naming Conventions

Use the existing JavaScript ES module style, two-space indentation, double quotes, and semicolons. Name React components and Mongoose models in `PascalCase` (for example, `TitleModal.jsx` and `User.js`); use `camelCase` for functions and variables. Keep route filenames lowercase with a `.routes.js` suffix. Put shared HTTP calls in `frontend/src/services/api.js` and backend integrations in `backend/src/services/`. No formatter or linter is configured; keep edits consistent with neighboring files.

## Testing Guidelines

Backend and frontend tests use Node's built-in test runner; run them with `npm test --prefix backend` and `npm test --prefix frontend`. Tests use descriptive `*.test.js` filenames. No coverage threshold is configured. Build the frontend with `npm run build --prefix frontend`, and manually check the affected flow. For API changes, check `GET /api/health` and the changed endpoint; for authentication or library changes, also verify sign-in, permissions, and session behavior.

## Commit & Pull Request Guidelines

Recent commits use short, informal, lowercase descriptions such as `reset pass fixed`; there is no enforced commit format. Write a concise subject that names the behavior changed. In pull requests, explain the change, link any issue, list verification steps, and include screenshots for UI changes. Note any environment-variable or deployment changes.

## Security & Configuration

Keep `.env` and `.env.local` files untracked; `.gitignore` excludes them. Set secrets only in local or hosting environment variables, never in client code or documentation. Rotate any credential that has been exposed. See `frontend/docs/deployment.md` for required production settings.
