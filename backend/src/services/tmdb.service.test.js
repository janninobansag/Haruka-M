import assert from "node:assert/strict";
import test from "node:test";
import { createTtlCache } from "./ttl-cache.js";
import { createTmdbClient } from "./tmdb.service.js";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

test("TTL cache reuses successful values until expiry", async () => {
  let currentTime = 0;
  let calls = 0;
  const cache = createTtlCache({ now: () => currentTime });
  const load = async () => ({ call: ++calls });

  assert.deepEqual(await cache.getOrLoad("item", 10, load), { call: 1 });
  assert.deepEqual(await cache.getOrLoad("item", 10, load), { call: 1 });
  assert.equal(calls, 1);

  currentTime = 10;
  assert.deepEqual(await cache.getOrLoad("item", 10, load), { call: 2 });
  assert.equal(calls, 2);
});

test("TTL cache coalesces concurrent loads and does not cache failures", async () => {
  const cache = createTtlCache();
  let calls = 0;
  let release;
  const load = () => {
    calls += 1;
    return new Promise((resolve) => { release = resolve; });
  };

  const first = cache.getOrLoad("same", 1000, load);
  const second = cache.getOrLoad("same", 1000, load);
  await Promise.resolve();
  assert.equal(calls, 1);
  release({ ok: true });
  assert.deepEqual(await Promise.all([first, second]), [{ ok: true }, { ok: true }]);

  let failures = 0;
  const failingLoad = async () => {
    failures += 1;
    throw new Error("temporary failure");
  };
  await assert.rejects(cache.getOrLoad("failure", 1000, failingLoad), /temporary failure/);
  await assert.rejects(cache.getOrLoad("failure", 1000, failingLoad), /temporary failure/);
  assert.equal(failures, 2);
});

test("TTL cache keeps the most recently used entries within its bound", async () => {
  const cache = createTtlCache({ maxEntries: 2 });
  const calls = new Map();
  const load = (key) => async () => {
    calls.set(key, (calls.get(key) || 0) + 1);
    return key;
  };

  await cache.getOrLoad("a", 1000, load("a"));
  await cache.getOrLoad("b", 1000, load("b"));
  await cache.getOrLoad("a", 1000, load("a"));
  await cache.getOrLoad("c", 1000, load("c"));
  await cache.getOrLoad("a", 1000, load("a"));
  await cache.getOrLoad("b", 1000, load("b"));

  assert.equal(calls.get("a"), 1);
  assert.equal(calls.get("b"), 2);
  assert.equal(calls.get("c"), 1);
});

test("TMDB client caches by normalized path and parameters with the selected TTLs", async () => {
  const originalKey = process.env.TMDB_API_KEY;
  process.env.TMDB_API_KEY = "test-key";
  let currentTime = 0;
  let calls = 0;
  const client = createTmdbClient({
    now: () => currentTime,
    fetchImpl: async () => {
      calls += 1;
      return { ok: true, json: async () => ({ call: calls }) };
    }
  });

  try {
    assert.deepEqual(await client("/trending/movie/day", { page: 1, region: "SG" }), { call: 1 });
    assert.deepEqual(await client("/trending/movie/day", { region: "SG", page: 1 }), { call: 1 });
    assert.equal(calls, 1);

    currentTime = DAY_MS;
    assert.deepEqual(await client("/trending/movie/day", { page: 1, region: "SG" }), { call: 2 });
    assert.deepEqual(await client("/search/movie", { query: "haruka", page: 1 }), { call: 3 });
    assert.deepEqual(await client("/search/movie", { query: "haruka", page: 1 }), { call: 3 });
    currentTime += 2 * MINUTE_MS;
    assert.deepEqual(await client("/search/movie", { query: "haruka", page: 1 }), { call: 4 });
    assert.deepEqual(await client("/movie/123/videos"), { call: 5 });
    currentTime += HOUR_MS;
    assert.deepEqual(await client("/movie/123/videos"), { call: 6 });
    assert.deepEqual(await client("/movie/123/", { append_to_response: "credits" }), { call: 7 });
    assert.deepEqual(await client("/movie/123", { append_to_response: "credits" }), { call: 7 });
    currentTime += HOUR_MS;
    assert.deepEqual(await client("/movie/123", { append_to_response: "credits" }), { call: 8 });
    assert.deepEqual(await client("/discover/movie", { page: 1, sort_by: "popularity.desc" }), { call: 9 });
    currentTime += 15 * MINUTE_MS;
    assert.deepEqual(await client("/discover/movie", { page: 1, sort_by: "popularity.desc" }), { call: 10 });
    assert.equal(calls, 10);
  } finally {
    if (originalKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = originalKey;
  }
});

test("TMDB errors are not cached", async () => {
  const originalKey = process.env.TMDB_API_KEY;
  process.env.TMDB_API_KEY = "test-key";
  let calls = 0;
  const client = createTmdbClient({
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return { ok: false, status: 503 };
      return { ok: true, json: async () => ({ results: [] }) };
    }
  });

  try {
    await assert.rejects(client("/search/movie", { query: "haruka" }), /TMDB request failed \(503\)/);
    assert.deepEqual(await client("/search/movie", { query: "haruka" }), { results: [] });
    assert.equal(calls, 2);
  } finally {
    if (originalKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = originalKey;
  }
});

test("TMDB reads explicitly marked private bypass the response cache", async () => {
  const originalKey = process.env.TMDB_API_KEY;
  process.env.TMDB_API_KEY = "test-key";
  let calls = 0;
  const client = createTmdbClient({
    fetchImpl: async () => ({ ok: true, json: async () => ({ call: ++calls }) })
  });

  try {
    assert.deepEqual(await client("/movie/456", {}, { cache: false }), { call: 1 });
    assert.deepEqual(await client("/movie/456", {}, { cache: false }), { call: 2 });
    assert.equal(calls, 2);
  } finally {
    if (originalKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = originalKey;
  }
});
