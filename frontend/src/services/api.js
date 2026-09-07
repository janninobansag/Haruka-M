const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function getCollection(collection, type, page = 1) {
  const response = await fetch(`${apiUrl}/discover/${collection}?type=${type}&page=${page}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Could not load this collection.");
  return data.results;
}

export async function auth(path, body) {
  const response = await fetch(`${apiUrl}/auth/${path}`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

export async function getSession() {
  const response = await fetch(`${apiUrl}/auth/me`, { credentials: "include" });
  if (response.status === 401) return null;
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Could not restore your session.");
  return data.user;
}

export async function updateProfile(profile) {
  const response = await fetch(`${apiUrl}/auth/me`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Could not update your account.");
  return data.user;
}

export async function changePassword(passwords) {
  const response = await fetch(`${apiUrl}/auth/me/password`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(passwords) });
  if (response.status === 204) return;
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Could not change your password.");
}

async function adminRequest(path, options = {}) {
  const response = await fetch(`${apiUrl}/admin${path}`, { credentials: "include", ...options, headers: { "Content-Type": "application/json", ...options.headers } });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.message || "Admin request failed.");
  return data;
}
export const getExclusives = () => adminRequest("/exclusives").then((data) => data.results);
export const createExclusive = (title) => adminRequest("/exclusives", { method: "POST", body: JSON.stringify(title) });
export const updateExclusivePublication = (id, isPublished) => adminRequest(`/exclusives/${id}`, { method: "PATCH", body: JSON.stringify({ isPublished }) });
export const deleteExclusive = (id) => adminRequest(`/exclusives/${id}`, { method: "DELETE" });
export const getUsers = () => adminRequest("/users").then((data) => data.results);
export const updateUserRole = (id, role) => adminRequest(`/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) });
export const updateUserStatus = (id, isActive) => adminRequest(`/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ isActive }) });
export const approveUser = (id) => adminRequest(`/users/${id}/approval`, { method: "PATCH" });
export const deleteUser = (id) => adminRequest(`/users/${id}`, { method: "DELETE" });

async function libraryRequest(path, options = {}) {
  const response = await fetch(`${apiUrl}/me${path}`, { credentials: "include", ...options, headers: { "Content-Type": "application/json", ...options.headers } });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(data?.message || "Library request failed.");
  return data;
}
export const getWatchlist = () => libraryRequest("/watchlist").then((data) => data.results);
export const addWatchlistItem = (title) => libraryRequest("/watchlist", { method: "POST", body: JSON.stringify({ tmdbId: title.id, mediaType: title.mediaType }) });
export const deleteWatchlistItem = (id, type) => libraryRequest(`/watchlist/${id}?type=${type}`, { method: "DELETE" });
export const getRecentlyViewed = () => libraryRequest("/recent").then((data) => data.results);
export const saveRecentlyViewed = (title) => libraryRequest("/recent", { method: "PUT", body: JSON.stringify(title) });

export async function searchTitles(query, type) {
  const response = await fetch(`${apiUrl}/search?query=${encodeURIComponent(query)}&type=${type}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Search could not be completed.");
  return data.results;
}

export async function getTrailer(title) {
  const response = await fetch(`${apiUrl}/titles/${title.mediaType}/${title.id}/trailer`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Trailer could not be loaded.");
  return data;
}

export async function getTitleDetails(title) {
  const response = await fetch(`${apiUrl}/titles/${title.mediaType}/${title.id}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Title details could not be loaded.");
  return data;
}
