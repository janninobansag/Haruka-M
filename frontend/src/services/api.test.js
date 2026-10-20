import assert from "node:assert/strict";
import test from "node:test";
import {
  getCollection,
  getSession,
  getTitleDetails,
  getTrailer,
  getUsers,
  getWatchlist,
  searchTitles
} from "./api.js";

function jsonResponse(body, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body };
}

test("public catalog helpers keep response shapes and private reads bypass the cache", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  const movieId = 8723491;

  globalThis.fetch = async (input, options = {}) => {
    const url = new URL(String(input));
    requests.push({ url, options });

    if (url.pathname === "/api/discover/trending") {
      return jsonResponse({ collection: "trending", type: "movie", results: [{ id: 1, title: "Trend" }] });
    }
    if (url.pathname === "/api/discover/haruka-only") {
      return jsonResponse({ collection: "haruka-only", type: "movie", results: [{ _id: "exclusive" }] });
    }
    if (url.pathname === "/api/search") {
      return jsonResponse({ type: "movie", results: [{ id: 2, title: "Search result" }] });
    }
    if (url.pathname === `/api/titles/movie/${movieId}`) {
      return jsonResponse({ id: movieId, mediaType: "movie", title: "Details", cast: ["Actor"] });
    }
    if (url.pathname === `/api/titles/movie/${movieId}/trailer`) {
      return jsonResponse({ key: "trailer-key", name: "Trailer", site: "YouTube" });
    }
    if (url.pathname === "/api/auth/me") return jsonResponse({ user: { id: "user-1" } });
    if (url.pathname === "/api/admin/users") return jsonResponse({ results: [{ id: "admin-user" }] });
    if (url.pathname === "/api/me/watchlist") return jsonResponse({ results: [{ tmdbId: movieId }] });
    throw new Error(`Unexpected request: ${url}`);
  };

  try {
    const collection = await getCollection("trending", "movie");
    assert.deepEqual(collection, [{ id: 1, title: "Trend" }]);
    assert.deepEqual(await getCollection("trending", "movie"), collection);
    assert.deepEqual(await getCollection("haruka-only", "movie"), [{ _id: "exclusive" }]);
    assert.deepEqual(await getCollection("haruka-only", "movie"), [{ _id: "exclusive" }]);

    assert.deepEqual(await searchTitles("load smoke", "movie"), [{ id: 2, title: "Search result" }]);
    assert.deepEqual(await getTitleDetails({ id: movieId, mediaType: "movie" }), {
      id: movieId, mediaType: "movie", title: "Details", cast: ["Actor"]
    });
    assert.deepEqual(await getTrailer({ id: movieId, mediaType: "movie" }), {
      key: "trailer-key", name: "Trailer", site: "YouTube"
    });

    assert.deepEqual(await getSession(), { id: "user-1" });
    assert.deepEqual(await getSession(), { id: "user-1" });
    assert.deepEqual(await getUsers(), [{ id: "admin-user" }]);
    assert.deepEqual(await getUsers(), [{ id: "admin-user" }]);
    assert.deepEqual(await getWatchlist(), [{ tmdbId: movieId }]);
    assert.deepEqual(await getWatchlist(), [{ tmdbId: movieId }]);

    const count = (path) => requests.filter(({ url }) => url.pathname === path).length;
    assert.equal(count("/api/discover/trending"), 1);
    assert.equal(count("/api/discover/haruka-only"), 2);
    assert.equal(count("/api/search"), 1);
    assert.equal(count(`/api/titles/movie/${movieId}`), 1);
    assert.equal(count(`/api/titles/movie/${movieId}/trailer`), 1);
    assert.equal(count("/api/auth/me"), 2);
    assert.equal(count("/api/admin/users"), 2);
    assert.equal(count("/api/me/watchlist"), 2);
    assert.ok(requests.filter(({ url }) => ["/api/auth/me", "/api/admin/users", "/api/me/watchlist"].includes(url.pathname))
      .every(({ options }) => options.credentials === "include"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
