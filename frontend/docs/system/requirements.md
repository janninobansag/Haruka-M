# Haruka System Requirements

## Functional requirements

- Visitors can view published movie information, genres, and trailers.
- Visitors can create an account with name, email, and password.
- Registered users can sign in/out, browse, search, manage a watchlist, play authorized content, and resume viewing.
- Every browser registration becomes `user`; clients must never choose the `admin` role.
- Admins can create, edit, publish, archive, and organize movies and genres.
- Draft and archived movies are not public or playable.
- Movie and series discovery metadata is obtained from TMDB through the Haruka backend.
- The browse page provides Trending Today, Only on Haruka, Top Rated, Comedy, and Horror rails.
- Every discovery rail has a movie option and a series option.
- “Only on Haruka” contains only Haruka-managed titles marked exclusive; it is never represented as Netflix content.

## Non-functional requirements

- Responsive mobile, tablet, and desktop UI.
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
- Admins can promote or demote another Haruka user through Admin Studio; an admin cannot change their own role.
- A signed-in user can update their display name and change their password after supplying their current password.
- A signed-in user can see recently opened titles in a private Recently Explored rail.
- A working MongoDB connection is required for account, role, My List, and Admin Studio features.
- Feature playback, viewing progress, Continue Watching, and licensed media delivery remain planned.
