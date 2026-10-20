import assert from "node:assert/strict";
import test from "node:test";
import { createPublicRequestCache } from "./public-request.js";

function jsonResponse(body, ok = true) {
  return { ok, json: async () => body };
}

test("public request cache normalizes query order and expires entries", async () => {
  let currentTime = 0;
  let calls = 0;
  const cachedGet = createPublicRequestCache({ now: () => currentTime });
  const fetchImpl = async () => jsonResponse({ call: ++calls });

  assert.deepEqual(await cachedGet("/api/search?type=movie&query=haruka", 10, "failed", fetchImpl), { call: 1 });
  assert.deepEqual(await cachedGet("/api/search?query=haruka&type=movie", 10, "failed", fetchImpl), { call: 1 });
  assert.equal(calls, 1);

  currentTime = 10;
  assert.deepEqual(await cachedGet("/api/search?type=movie&query=haruka", 10, "failed", fetchImpl), { call: 2 });
  assert.equal(calls, 2);
});

test("public request cache separates different query values and coalesces concurrent loads", async () => {
  const cachedGet = createPublicRequestCache();
  let calls = 0;
  let release;
  const fetchImpl = () => {
    calls += 1;
    return new Promise((resolve) => { release = () => resolve(jsonResponse({ call: calls })); });
  };

  const first = cachedGet("/api/search?query=haruka&type=movie", 1000, "failed", fetchImpl);
  const second = cachedGet("/api/search?type=movie&query=haruka", 1000, "failed", fetchImpl);
  await Promise.resolve();
  assert.equal(calls, 1);
  release();
  assert.deepEqual(await Promise.all([first, second]), [{ call: 1 }, { call: 1 }]);

  const differentQuery = await cachedGet("/api/search?query=haruka&type=tv", 1000, "failed", async () => {
    calls += 1;
    return jsonResponse({ call: calls });
  });
  assert.deepEqual(differentQuery, { call: 2 });
  assert.equal(calls, 2);
});

test("public request cache does not retain failed responses", async () => {
  const cachedGet = createPublicRequestCache();
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) return jsonResponse({ message: "temporary failure" }, false);
    return jsonResponse({ results: [] });
  };

  await assert.rejects(cachedGet("/api/search?query=haruka", 1000, "fallback", fetchImpl), /temporary failure/);
  assert.deepEqual(await cachedGet("/api/search?query=haruka", 1000, "fallback", fetchImpl), { results: [] });
  assert.equal(calls, 2);
});

test("public request cache evicts least recently used entries at capacity", async () => {
  const cachedGet = createPublicRequestCache({ maxEntries: 2 });
  const calls = new Map();
  const fetchFor = (key) => async () => {
    calls.set(key, (calls.get(key) || 0) + 1);
    return jsonResponse({ key });
  };

  await cachedGet("/api/one", 1000, "failed", fetchFor("one"));
  await cachedGet("/api/two", 1000, "failed", fetchFor("two"));
  await cachedGet("/api/one", 1000, "failed", fetchFor("one"));
  await cachedGet("/api/three", 1000, "failed", fetchFor("three"));
  await cachedGet("/api/one", 1000, "failed", fetchFor("one"));
  await cachedGet("/api/two", 1000, "failed", fetchFor("two"));

  assert.equal(calls.get("one"), 1);
  assert.equal(calls.get("two"), 2);
  assert.equal(calls.get("three"), 1);
});
