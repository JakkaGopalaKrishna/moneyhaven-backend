/**
 * A very simple in-memory caching service to avoid re-running expensive aggregations
 * on every single dashboard load.
 */

const cache = new Map();
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

const get = (key) => {
  const item = cache.get(key);
  if (!item) return null;

  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.value;
};

const set = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  const expiry = Date.now() + ttlMs;
  cache.set(key, { value, expiry });
};

const invalidate = (userId) => {
  // Simple invalidation strategy: delete any key that starts with the userId
  // In production, we'd use Redis or a more robust tagging strategy.
  const prefix = String(userId);
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
};

module.exports = {
  get,
  set,
  invalidate,
};
