export function createTtlCache({ maxEntries = 100, now = Date.now } = {}) {
  const entries = new Map();
  const inFlight = new Map();

  function pruneExpired(currentTime) {
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= currentTime) entries.delete(key);
    }
  }

  return {
    async getOrLoad(key, ttlMs, loader) {
      const currentTime = now();
      pruneExpired(currentTime);

      if (entries.has(key)) {
        const entry = entries.get(key);
        entries.delete(key);
        entries.set(key, entry);
        return entry.value;
      }

      if (inFlight.has(key)) return inFlight.get(key);

      const pending = Promise.resolve()
        .then(loader)
        .then((value) => {
          if (ttlMs > 0 && maxEntries > 0) {
            entries.delete(key);
            entries.set(key, { value, expiresAt: now() + ttlMs });
            while (entries.size > maxEntries) {
              entries.delete(entries.keys().next().value);
            }
          }
          return value;
        })
        .finally(() => inFlight.delete(key));

      inFlight.set(key, pending);
      return pending;
    }
  };
}
