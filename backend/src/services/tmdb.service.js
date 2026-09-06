const baseUrl = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";

export const imageUrl = (path, size = "w500") =>
  path ? `${process.env.TMDB_IMAGE_BASE_URL || "https://image.tmdb.org/t/p"}/${size}${path}` : null;

export async function tmdb(path, params = {}) {
  if (!process.env.TMDB_API_KEY) {
    const error = new Error("TMDB_API_KEY is missing. Add it to backend/.env and restart the API.");
    error.status = 503;
    throw error;
  }

  const url = new URL(`${baseUrl}${path}`);
  Object.entries(params).forEach(([key, value]) => value != null && url.searchParams.set(key, value));
  // TMDB's v3 API key is sent server-to-server as a query parameter.
  url.searchParams.set("api_key", process.env.TMDB_API_KEY);
  const response = await fetch(url, { headers: { accept: "application/json" } });

  if (!response.ok) {
    const error = new Error(`TMDB request failed (${response.status}).`);
    error.status = response.status === 401 ? 502 : response.status;
    throw error;
  }
  return response.json();
}

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
