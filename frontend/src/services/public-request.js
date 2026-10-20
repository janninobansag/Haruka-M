import { createTtlCache } from "./ttl-cache.js";

function normalizedRequestKey(input) {
  const url = new URL(input, "http://haruka.local");
  const parameters = [...url.searchParams.entries()]
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue));
  const query = new URLSearchParams(parameters).toString();
  return `${url.origin}${url.pathname}${query ? `?${query}` : ""}`;
}

export function createPublicRequestCache({ maxEntries = 100, now = Date.now } = {}) {
  const cache = createTtlCache({ maxEntries, now });

  return async function cachedPublicGetJson(url, ttlMs, fallbackMessage, fetchImpl = globalThis.fetch) {
    return cache.getOrLoad(normalizedRequestKey(url), ttlMs, async () => {
      const response = await fetchImpl(url);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || fallbackMessage);
      return data;
    });
  };
}

export const cachedPublicGetJson = createPublicRequestCache();
