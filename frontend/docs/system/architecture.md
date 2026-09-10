# Haruka System Architecture

## 1. Product overview

Haruka is a Netflix-inspired movie streaming platform with its own visual identity and curated content experience. Visitors can discover movies, view trailers and details, and create an account. Signed-in users can manage a profile, maintain a watchlist, and continue watching authorized content. Administrators manage the catalog and users.

Haruka is delivered as a responsive web client and installable PWA. It consumes the Express API through Vercel's same-origin `/api` rewrite, while browser sessions use HTTP-only cookies.

The responsive navigation displays a human-profile icon for authenticated accounts and collapses to a hamburger menu on narrow screens. My List removal uses the ownership-protected `DELETE /api/me/watchlist/:tmdbId?type=movie|tv` endpoint and removes the card locally after a successful response.

Haruka must only deliver media it owns or is licensed to distribute. Video files are stored and streamed through object storage and a CDN; they are not stored in MongoDB.

## 2. Goals and scope

### Initial release

- Responsive, dark, cinematic browsing experience.
- Sign-up, sign-in, sign-out, and protected sessions.
- Three roles: `user`, `admin`, and `superadmin`.
- Movie browsing by featured collections and genre.
- Separate movie and series views for every discovery collection.
- Search, movie details, trailers, watchlist, and continue-watching progress.
- Admin catalog management for movies, genres, artwork, trailers, and approved video sources.

### Out of scope for the first release

- Subscription billing, multiple household profiles, offline downloads, recommendation ML, and live streaming.

## 3. Architecture at a glance

```text
Browser (React + Vite)
        |
        | HTTPS / JSON API
        v
Node.js + Express API
  |       |         |
  |       |         +-- Object storage + CDN (posters, trailers, licensed video)
  |       +-- MongoDB (application data)
  +-- Authentication and role authorization
```

| Layer | Responsibility |
| --- | --- |
| Frontend | UI, routing, form validation, API calls, player integration, local display state. |
| API | Business rules, authentication, role checks, validation, TMDB catalog integration, and signed media access. |
| MongoDB | Users, movies, genres, watchlists, and viewing progress. |
| Object storage/CDN | Private video assets and public/restricted artwork; scalable media delivery. |

## 4. Project layout

```text
Haruka/
├── frontend/
│   ├── public/
│   └── src/
│       ├── assets/        # local branding assets
│       ├── components/    # reusable UI, cards, navbar, player wrapper
│       ├── features/      # auth, catalog, watchlist, player features
│       ├── hooks/
│       ├── pages/         # route-level pages
│       ├── services/      # API client and request modules
│       └── styles/
├── backend/
│   ├── src/
│   │   ├── config/        # database and environment setup
│   │   ├── controllers/   # HTTP request handlers
│   │   ├── middleware/    # auth, roles, errors, validation
│   │   ├── models/        # Mongoose schemas
│   │   ├── routes/        # API route definitions
│   │   ├── services/      # business logic and storage integration
│   │   └── utils/
│   └── uploads/           # development-only temporary uploads
└── docs/
    ├── system/
    └── milestones/
```

## 5. Frontend design

### Main pages

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Landing page; promoted title and account call-to-action. |
| `/signin` | Public | Sign-in form. |
| `/signup` | Public | Account registration form. |
| `/browse` | User/Admin | Personalized home page with hero title and horizontal movie rows. |
| `/search` | User/Admin | Search results and genre filtering. |
| `/movies/:slug` | Public | Movie information, trailer, cast, genre, and watch action. |
| `/watch/:movieId` | User/Admin | Authorized video player and progress saving. |
| `/my-list` | User/Admin | User watchlist. |
| `/account` | User/Admin | Account details and security actions. |
| `/admin` | Admin | Catalog administration dashboard. |

### Netflix-inspired, distinctly Haruka UI

- Dark interface with a Haruka-specific wordmark, color palette, typography, and motion system.
- The navigation uses the transparent Haruka logo asset at `frontend/public/haruka-logo.png`; the browser-tab icon uses the matching square mark at `frontend/public/haruka-favicon.png`.
- A hero feature and horizontal content rails make browsing fast, while avoiding Netflix branding, artwork, copy, and exact layouts.
- Movie cards show poster art, title, maturity rating, runtime, and quick actions.
- Detail pages provide richer editorial metadata, trailer playback, and related titles.
- The player uses a focused, distraction-free layout with progress resume.

### Browse collections

The `/browse` page has a movie/series switch. Switching it reloads each rail for the selected type without changing the Haruka visual structure.

| Rail | Movie option | Series option | Source and rule |
| --- | --- | --- | --- |
| Trending Today | Trending movies today | Trending series today | TMDB trending results for the day. |
| Only on Haruka | Haruka-exclusive movies | Haruka-exclusive series | Haruka-managed titles that Haruka owns or is licensed to present exclusively. Do not call this “Only on Netflix.” |
| Top Rated | Top-rated movies | Top-rated series | TMDB top-rated results, with pagination. |
| Comedy | Comedy movies | Comedy series | TMDB discover results filtered by the Comedy genre. |
| Horror | Horror movies | Horror series | TMDB discover results filtered by the Horror genre. |

TMDB genre IDs can differ by media type. Fetch and cache `/genre/movie/list` and `/genre/tv/list`, then resolve the `Comedy` and `Horror` IDs from their names instead of hard-coding them.

### Client state

- Store authenticated user/session state in an authentication context or state store.
- Fetch catalog data through feature-specific service modules.
- Keep transient UI state local; do not duplicate the catalog globally unless caching is needed.
- On a `401` response, clear session state and redirect to `/signin`.

## 6. Authentication and authorization

### Roles

| Role | Permissions |
| --- | --- |
| `user` | After approval: browse, search, view details/trailers, play authorized movies, save watchlist/progress, and manage own account. Before approval: title details and trailers only. |
| `admin` | All approved-user permissions plus create, update, publish/unpublish, and remove Haruka catalog records. Admin accounts bypass member approval. Can approve, deactivate/reactivate, and permanently delete `user` accounts only. |
| `superadmin` | All admin permissions. Super-admin accounts bypass member approval. Can manage roles for `user` and `admin` accounts, and approve, deactivate/reactivate, or permanently delete `admin` accounts. |

### Initial super-admin setup

The application never creates a super admin through public registration. After choosing the trusted first account, set its `role` field to `superadmin` once in MongoDB Compass (database `haruka`, collection `users`), then sign out and sign back in. That account can assign roles to lower-level accounts from Admin Studio.

### Sign-up flow

1. Visitor submits name, email, and password at `/signup`.
2. API validates input, ensures unique email, hashes password with bcrypt, and creates a user with role `user` and `approvalStatus: 'pending'`.
3. API returns an awaiting-approval response without creating a session.
4. An admin or super admin approves the regular-user account from Admin Studio before the person can sign in. Admin and super-admin accounts bypass this member-approval check.

### Sign-in flow

1. User submits email and password at `/signin`.
2. API finds the user and compares password to the stored bcrypt hash.
3. API rejects pending accounts with an awaiting-approval response; approved accounts receive a session token in a secure HTTP-only cookie and safe profile and role.
4. Frontend restores the session on startup with `GET /api/auth/me`.

### Session policy

- Use short-lived JWT access tokens in `HttpOnly`, `Secure`, `SameSite=Lax` cookies in production.
- When Remember me is selected at sign-in, issue a 30-day JWT in a persistent `HttpOnly` cookie. Otherwise, use a browser-session cookie with a one-day JWT. Never store a raw password or reusable credential in browser storage.
- Add refresh-token rotation/revocation for persistent sessions.
- Never store plaintext passwords or authentication tokens in MongoDB, localStorage, logs, or responses.
- Enforce HTTPS and CORS limited to Haruka's frontend origin in production.

### Middleware and authorization

```text
Request → security headers/CORS/JSON → rate limit → authenticate → authorize role
        → validate → controller → service → MongoDB/storage → error handler
```

- `requireAuth` allows only active, approved authenticated accounts; a pending account cannot use protected APIs even if it has a stale session cookie.
- `requireRole('admin')` protects catalog writes and all `/admin` API actions; `superadmin` satisfies that minimum role.
- User-management routes also verify the target account's role. An admin can only manage a `user`; a super admin can manage `user` and `admin` accounts. Super-admin accounts are protected from peer modification in Admin Studio.
- Ownership checks restrict watchlists, progress, and account updates to their owner.
- The API always checks roles; hiding an admin control in the frontend is not security.

## 7. Data model

## 7. TMDB catalog integration

TMDB is Haruka's initial source for movie and series discovery metadata: titles, synopses, genres, cast, trailers, release dates, ratings, and poster/backdrop paths. Haruka's frontend must call the Haruka backend, not TMDB directly.

```text
React frontend → Haruka API → TMDB API
                     |
                     └→ MongoDB (Haruka users, lists, progress, admin data)
```

### Integration rules

- Store `TMDB_API_KEY` only in `backend/.env`; never use it in `frontend/.env`, commit it, or display it in the browser.
- Create a backend TMDB service responsible for all external TMDB requests, response normalization, timeouts, and error handling.
- Expose Haruka endpoints such as `/api/discover`, `/api/search`, `/api/movies/:tmdbId`, and `/api/series/:tmdbId` to the frontend.
- Use TMDB's `media_type` or separate movie/TV endpoints so the UI can clearly distinguish movies from series.
- Persist `tmdbId` with each watchlist/progress record. Fetch fresh catalog details from TMDB when the user opens a title; add caching later if needed.
- Respect TMDB's attribution, branding, and usage requirements before production release. TMDB data does not grant rights to stream video content.

### Discovery mapping

The frontend requests a normalized endpoint rather than knowing TMDB paths. The backend maps these requests to TMDB and normalizes all results to one card shape.

| Haruka request | `type` value | TMDB source |
| --- | --- | --- |
| `/api/discover/trending?type=movie` | `movie` | `/trending/movie/day`. |
| `/api/discover/trending?type=tv` | `tv` | `/trending/tv/day`. |
| `/api/discover/top-rated?type=movie` | `movie` | `/movie/top_rated`. |
| `/api/discover/top-rated?type=tv` | `tv` | `/tv/top_rated`. |
| `/api/discover/genre/comedy?type=movie` | `movie` | `/discover/movie` using the resolved Comedy genre ID. |
| `/api/discover/genre/comedy?type=tv` | `tv` | `/discover/tv` using the resolved Comedy genre ID. |
| `/api/discover/genre/horror?type=movie` | `movie` | `/discover/movie` using the resolved Horror genre ID. |
| `/api/discover/genre/horror?type=tv` | `tv` | `/discover/tv` using the resolved Horror genre ID. |
| `/api/discover/haruka-only?type=movie` | `movie` | Haruka MongoDB collection, filtered to published/exclusive movie titles. |
| `/api/discover/haruka-only?type=tv` | `tv` | Haruka MongoDB collection, filtered to published/exclusive series titles. |

The `type` query must only accept `movie` or `tv`; reject other values with `400 Bad Request`. Cache TMDB discovery results briefly (for example, 15–60 minutes) to improve speed and reduce API use. Trending content should refresh daily.

### Backend environment variables

```env
TMDB_API_KEY=your_tmdb_api_key
TMDB_BASE_URL=https://api.themoviedb.org/3
TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p
```

`TMDB_IMAGE_BASE_URL` combines with poster or backdrop paths returned by TMDB. Choose image widths appropriate to each UI component, such as `w342` for cards and `w1280` for backdrops.

## 8. Data model

### User

```js
{
  _id, name, email, passwordHash,
  role, // 'user' | 'admin' | 'superadmin'; default 'user'
  approvalStatus, // 'pending' | 'approved'; default 'pending'
  avatarUrl, isActive, createdAt, updatedAt
}
```

Use a unique normalized (lowercase) index on `email`.

### Movie

```js
{
  _id, tmdbId, mediaType, // mediaType: 'movie' | 'tv'
  title, slug, synopsis, releaseYear, runtimeMinutes, maturityRating,
  genres: [genreId], cast: [String], director,
  posterUrl, backdropUrl, trailerUrl,
  videoAssetKey, // private storage key, not a video binary
  status, // 'draft' | 'published' | 'archived'
  featured, createdBy: userId, createdAt, updatedAt
}
```

For TMDB-sourced titles, `tmdbId` is required and unique per media type. `videoAssetKey` remains optional and is only used for Haruka-owned/licensed playback.

### Series

```js
{
  _id, tmdbId, name, slug, overview,
  firstAirYear, genres: [genreId], posterUrl, backdropUrl,
  status, featured, createdAt, updatedAt
}
```

Add `Season` and `Episode` records only when Haruka is licensed to stream the series and needs its own playback asset mapping.

### Genre

```js
{ _id, name, slug, description, createdAt, updatedAt }
```

### Watchlist item

```js
{ _id, userId, movieId, createdAt }
```

Use a compound unique index on `userId + movieId`.

### Viewing progress

```js
{ _id, userId, movieId, progressSeconds, durationSeconds, completed, lastWatchedAt, updatedAt }
```

Use a compound unique index on `userId + movieId`.

## 9. API design

All endpoints have the `/api` prefix and return JSON. Error format:

```json
{ "message": "Human-readable error message", "code": "ERROR_CODE" }
```

### Authentication

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/auth/signup` | Public | Create a `user` account and session. |
| POST | `/auth/signin` | Public | Start a session. |
| POST | `/auth/signout` | User/Admin | Clear or revoke current session. |
| GET | `/auth/me` | User/Admin | Return current safe user profile. |

### TMDB catalog

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/discover` | Public | Curated TMDB movies and series; supports `type`, `genre`, and `page`. |
| GET | `/discover/:collection` | Public | A named Haruka collection: `trending`, `top-rated`, or `haruka-only`; requires `type=movie` or `type=tv`. |
| GET | `/discover/genre/:name` | Public | A genre collection such as `comedy` or `horror`; requires `type=movie` or `type=tv`. |
| GET | `/search` | Public | TMDB title search; supports `query`, `type`, and `page`. |
| GET | `/movies/:tmdbId` | Public | Normalized TMDB movie details. |
| GET | `/series/:tmdbId` | Public | Normalized TMDB series details, seasons, and episodes. |
| GET | `/genres` | Public | Genres. |
| POST | `/admin/movies` | Admin | Create Haruka catalog override or licensed movie draft. |
| PATCH | `/admin/movies/:id` | Admin | Update Haruka catalog override/publication status. |
| DELETE | `/admin/movies/:id` | Admin | Archive/remove according to retention policy. |
| POST | `/genres` | Admin | Create genre. |

### User library and playback

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/me/watchlist` | User/Admin | Caller's watchlist. |
| POST | `/me/watchlist/:tmdbId` | User/Admin | Add a TMDB title with media type to watchlist. |
| DELETE | `/me/watchlist/:tmdbId` | User/Admin | Remove title from watchlist. |
| GET | `/me/progress` | User/Admin | Continue-watching items. |
| PUT | `/me/progress/:movieId` | User/Admin | Upsert caller viewing progress. |
| POST | `/movies/:movieId/playback` | User/Admin | Return short-lived signed playback URL after authorization. |

### Implemented API endpoints

The endpoints below are currently implemented in the Haruka codebase. They are the source of truth for the current development build; the broader catalog and playback endpoints above remain planned where noted.

| Method | Endpoint | Access | Current behavior |
| --- | --- | --- | --- |
| GET | `/health` | Public | Returns API health status. |
| POST | `/auth/signup` | Public | Creates a MongoDB user with role `user`, hashes the password, and creates a secure cookie session. |
| POST | `/auth/signin` | Public | Verifies credentials and creates a secure cookie session. |
| POST | `/auth/signout` | User/Admin | Clears the Haruka session cookie. |
| GET | `/auth/me` | User/Admin | Restores the current session and returns safe user fields. |
| PATCH | `/auth/me` | User/Admin | Updates the signed-in user's display name. |
| PATCH | `/auth/me/password` | User/Admin | Verifies the current password and updates the signed-in user's password hash. |
| GET | `/discover/trending` | Public | TMDB daily trending titles. |
| GET | `/discover/top-rated` | Public | TMDB top-rated titles. |
| GET | `/discover/comedy` | Public | TMDB Comedy titles. |
| GET | `/discover/horror` | Public | TMDB Horror titles. |
| GET | `/discover/haruka-only` | Public | MongoDB-backed Haruka-exclusive titles. |
| GET | `/search` | Public | Searches TMDB titles using `query` and `type`. |
| GET | `/me/watchlist` | User/Admin | Returns the signed-in user's saved titles. |
| POST | `/me/watchlist` | User/Admin | Saves a TMDB title to the signed-in user's list. |
| DELETE | `/me/watchlist/:tmdbId?type=movie|tv` | User/Admin | Removes a title owned by the signed-in user. |
| GET | `/admin/exclusives` | Admin | Lists Haruka-exclusive titles. |
| POST | `/admin/exclusives` | Admin | Imports a title from TMDB into the Haruka-exclusive collection. |
| PATCH | `/admin/exclusives/:id` | Admin | Publishes or unpublishes an existing Haruka-exclusive title. |
| DELETE | `/admin/exclusives/:id` | Admin | Removes a Haruka-exclusive title. |
| GET | `/admin/users` | Admin | Lists safe Haruka user fields for role management. |
| PATCH | `/admin/users/:id/role` | Super Admin | Changes the role of a `user` or `admin`; super-admin accounts are protected. |
| PATCH | `/admin/users/:id/status` | Admin/Super Admin | Admins may change a `user`; super admins may also change an `admin`. A deactivated user cannot authenticate. |
| DELETE | `/admin/users/:id` | Admin/Super Admin | Deletes an allowed lower-role account and its Haruka watchlist and exploration history. |

### Implemented MongoDB collections

| Collection | Purpose | Key rules |
| --- | --- | --- |
| `users` | Haruka website accounts and roles. | Email is unique; public sign-up always creates `user`. |
| `watchlistitems` | A user's saved TMDB titles. | Unique per `userId`, `tmdbId`, and media type. |
| `recentlyvieweds` | A user's private title-exploration history. | Unique per `userId`, `tmdbId`, and media type; newest items appear first and expire 10 days after the most recent open. |
| `exclusivetitles` | Admin-managed “Only on Haruka” catalog labels. | Unique per TMDB title and media type. |

### Current frontend features

- Dark, responsive Haruka browse interface with movie/series switch.
- Optional muted, looping hero video loaded from `frontend/public/hero.mp4`, with the featured TMDB backdrop as a fallback.
- TMDB-backed Trending Today, Top Rated, Comedy, Horror, and Only on Haruka rails.
- Explore all collection view with a paginated title grid for TMDB-backed rails.
- Search overlay with movie/series filtering and a 350 ms debounce.
- Sign-up/sign-in modal, cookie-backed session restoration, and sign-out control.
- Account panel for display-name changes, password changes, role visibility, and sign-out.
- My List modal for saving and removing a signed-in user's titles.
- Recently Explored rail for a signed-in user's private title-opening history.
- Admin Studio, visible only to a signed-in `admin`, for adding, publishing/unpublishing, and removing Only on Haruka entries, plus managing other users' roles.

### Current limitations

- The title panel is metadata-focused; licensed feature playback, trailer player integration, viewing progress, and continue watching are not implemented yet.
- “Only on Haruka” is a Haruka catalog label. It must only be used for content Haruka owns or is licensed to distribute exclusively.
- Authentication and admin/library data require a live MongoDB connection. TMDB discovery and search remain available when the database is offline.

## 10. Media delivery

1. An admin provides approved-media metadata; assets go into private object storage through a controlled server workflow.
2. Database stores the asset key, not the raw video file.
3. Player requests `/api/movies/:movieId/playback`.
4. API confirms movie publication, active account, and entitlement.
5. API returns a short-lived signed CDN/storage URL.

For production, use adaptive HLS or DASH, CDN delivery, short expiration times, and provider access controls. Trailers may remain public where licensed.

## 11. Security and privacy baseline

- Hash passwords using bcrypt; validate/sanitize input and enforce body-size limits.
- Rate-limit authentication and playback-token requests.
- Use Helmet/security headers, strict CORS, HTTPS, and secure cookies.
- Protect admin routes server-side and audit catalog changes.
- Store secrets only in environment variables; separate dev, staging, and production credentials.
- Keep TMDB credentials server-side and do not treat TMDB trailers or metadata as streaming rights.
- Return safe user fields only: `id`, `name`, `email`, `role`, and avatar.
- Define account deletion/data-retention rules before launch.

## 12. Deployment environments

### Frontend build note

Haruka uses Vite's `runner` configuration loader for development and production builds. This avoids an esbuild directory-access failure that can occur when the project is located inside a Windows OneDrive path. Run `npm run build --prefix frontend` to create the production bundle.

| Environment | Purpose | Notes |
| --- | --- | --- |
| Development | Local feature work | Local/isolated MongoDB and mock media. |
| Staging | Integration testing | Production-like configuration, non-production media. |
| Production | Public Haruka service | HTTPS, managed MongoDB, object storage/CDN, backups, monitoring. |

Required backend configuration:

```env
PORT=5000
MONGODB_URI=
JWT_SECRET=
CLIENT_URL=
MEDIA_STORAGE_BUCKET=
MEDIA_CDN_URL=
TMDB_API_KEY=
TMDB_BASE_URL=https://api.themoviedb.org/3
```

## 13. Implementation sequence

1. Complete MongoDB Atlas connectivity verification and rotate any exposed development credentials.
2. Add viewing progress, a licensed trailer/player integration, and Continue Watching.
3. Expand Admin Studio with editorial metadata and publication workflows.
4. Connect licensed media storage/CDN and signed playback URLs.
5. Add automated tests, logging, monitoring, backups, and deployment pipelines.
