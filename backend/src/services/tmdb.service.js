import { createTtlCache } from "./ttl-cache.js";

const baseUrl = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function cacheTtlForPath(path) {
  if (/^\/trending\/(movie|tv)\/day\/?$/.test(path)) return DAY_MS;
  if (/^\/search\/(movie|tv)\/?$/.test(path)) return 2 * MINUTE_MS;
  if (/^\/(movie|tv)\/\d+\/videos\/?$/.test(path)) return HOUR_MS;
  if (/^\/(movie|tv)\/\d+\/?$/.test(path)) return HOUR_MS;
  if (/^\/(movie|tv)\/top_rated\/?$/.test(path)) return 15 * MINUTE_MS;
  if (/^\/discover\/(movie|tv)\/?$/.test(path)) return 15 * MINUTE_MS;
  if (/^\/genre\/(movie|tv)\/list\/?$/.test(path)) return 15 * MINUTE_MS;
  return 0;
}

function cacheKeyFor(path, params) {
  const normalizedPath = `/${path.split("/").filter(Boolean).join("/")}`;
  const query = Object.entries(params)
    .filter(([, value]) => value != null)
    .map(([key, value]) => [key, String(value)])
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return query ? `${normalizedPath}?${query}` : normalizedPath;
}

export function createTmdbClient({ fetchImpl = (...args) => fetch(...args), now = Date.now, maxEntries = 250 } = {}) {
  const cache = createTtlCache({ maxEntries, now });

  return async function tmdb(path, params = {}, { cache: useCache = true } = {}) {
    if (!process.env.TMDB_API_KEY) {
      const error = new Error("TMDB_API_KEY is missing. Add it to backend/.env and restart the API.");
      error.status = 503;
      throw error;
    }

    const url = new URL(`${baseUrl}${path}`);
    Object.entries(params).forEach(([key, value]) => value != null && url.searchParams.set(key, value));
    // The secret is sent to TMDB but stays out of the cache key.
    url.searchParams.set("api_key", process.env.TMDB_API_KEY);

    const load = async () => {
      const response = await fetchImpl(url, { headers: { accept: "application/json" } });

      if (!response.ok) {
        const error = new Error(`TMDB request failed (${response.status}).`);
        error.status = response.status === 401 ? 502 : response.status;
        throw error;
      }
      return response.json();
    };

    if (!useCache) return load();
    return cache.getOrLoad(cacheKeyFor(path, params), cacheTtlForPath(path), load);
  };
}

export const tmdb = createTmdbClient();

export const imageUrl = (path, size = "w500") =>
  path ? `${process.env.TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p"}/${size}${path}` : null;

export function card(item, mediaType) {
  return {
    id: item.id,
    mediaType,
    title: item.title || item.name,
    overview: item.overview,
    year: (item.release_date || item.first_air_date || "").slice(0, 4),
    rating: item.vote_average ? item.vote_average.toFixed(1) : "—",
    poster: imageUrl(item.poster_path, "w500"),
    backdrop: imageUrl(item.backdrop_path, "w1280")
  };
}
