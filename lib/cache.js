// Tiny TTL cache: one in-flight fetch per key, last good value kept on error.
const entries = new Map();

async function cached(key, ttlSeconds, loader) {
  const now = Date.now();
  let e = entries.get(key);
  if (!e) {
    e = { value: undefined, at: 0, error: null, pending: null };
    entries.set(key, e);
  }
  if (e.value !== undefined && now - e.at < ttlSeconds * 1000) return e;
  if (!e.pending) {
    e.pending = loader()
      .then((v) => {
        e.value = v;
        e.at = Date.now();
        e.error = null;
      })
      .catch((err) => {
        e.error = String((err && err.message) || err);
        // back off: retry no sooner than 15 s
        e.at = Math.max(e.at, Date.now() - ttlSeconds * 1000 + 15000);
      })
      .finally(() => {
        e.pending = null;
      });
  }
  await e.pending;
  return e;
}

module.exports = { cached };
