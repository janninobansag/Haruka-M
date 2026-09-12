# Haruka System Requirements

## Functional requirements

- Visitors can view published movie information, genres, and trailers.
- Visitors can create an account with name, email, and password; new regular `user` accounts await approval from an admin or super admin. Admin and super-admin accounts do not require member approval.
- Visitors and pending accounts can browse title information and trailers only.
- Approved users can sign in/out, browse, search, manage a watchlist, play authorized content, and resume viewing.
- The sign-in form provides a Remember me option that keeps a secure session for 30 days without storing the email or password in browser storage.
- The responsive web client provides movie/series discovery, official trailer links, sign-up/sign-in, My List, and Recently Explored updates through the Haruka API.
- The web client is installable as a PWA and provides a hamburger navigation on narrow screens.
- Every browser registration becomes `user`; clients must never choose the `admin` or `superadmin` role.
- Admins and super admins can add, publish/unpublish, and remove Haruka-exclusive catalog labels.
- Draft and archived movies are not public or playable.
- Movie and series discovery metadata is obtained from TMDB through the Haruka backend.
- The browse page provides Trending Today, Only on Haruka, Top Rated, Comedy, and Horror rails.
- Every discovery rail has a movie option and a series option.
- Each discovery rail provides an Explore all view, with paginated loading for TMDB-backed collections.
- The primary navigation provides Discover and My List; separate Collections navigation is intentionally omitted.
- “Only on Haruka” contains only Haruka-managed titles marked exclusive; it is never represented as Netflix content.

## Non-functional requirements

- Responsive mobile, tablet, and desktop UI with PWA installation support.
- Passwords/sessions use the measures defined in `architecture.md`.
- Movie APIs support pagination and indexed search/filter queries.
- Playback URLs are short-lived and issued only after API-side authorization.
- The TMDB API key is present only in backend environment configuration and never sent to the browser.
- Structured errors, request logging, database backups, and environment-specific configuration.

## Authentication acceptance criteria

- A new account gets `user` even if the browser submits a role field.
- Failed sign-in does not reveal whether an email exists.
- Unauthenticated protected requests return `401`.
- Authenticated non-admin requests to admin endpoints return `403`.
- An admin can access catalog-management endpoints; a user cannot.

## Current delivery status

- Browse rails, TMDB search, authentication UI/API, My List, and Admin Studio are implemented.
- Signed-in users can add TMDB movie or series titles to My List and remove only their own saved titles.
- Admins can add and remove titles in the Only on Haruka collection through Admin Studio.
- Admins can publish or unpublish an Only on Haruka title; unpublished titles are hidden from public discovery.
- Admins can deactivate/reactivate and permanently delete standard users only. Super admins can also deactivate/reactivate and permanently delete admin accounts. Neither role can take these actions on a super-admin account.
- Admins and super admins can approve pending standard-user registrations from Admin Studio; public registration never grants administrator access, and admin/super-admin accounts bypass member approval.
- Only super admins can promote or demote a user or admin through Admin Studio; no account can change its own role.
- Admin Studio user rows preserve role and account actions on narrow screens; long names and account details truncate with an ellipsis.
- A signed-in user can update their display name and change their password after supplying their current password.
- A signed-in user can see recently opened titles in a private Recently Explored rail.
- Recently Explored records expire 10 days after the title was last opened, limiting retained history and database growth.
- The homepage supports an optional muted, looping hero background video supplied as a permitted local `hero.mp4` asset.
- A working MongoDB connection is required for account, role, My List, and Admin Studio features.
- Feature playback, viewing progress, Continue Watching, and licensed media delivery remain planned.
