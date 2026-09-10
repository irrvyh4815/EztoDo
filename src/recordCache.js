// Short-lived, memory-only cache. Never persist server records on disk.
export function createRecordCache(ttl = 30000) {
  const entries = new Map();
  return {
    clear() { entries.clear(); },
    async read(key, fetcher) {
      const existing = entries.get(key);
      if (existing && existing.expires > Date.now()) return existing.promise;
      const entry = { expires: Infinity };
      entry.promise = Promise.resolve().then(fetcher).then(value => {
        entry.expires = Date.now() + ttl;
        return value;
      }, error => { if (entries.get(key) === entry) entries.delete(key); throw error; });
      entries.set(key, entry);
      return entry.promise;
    },
  };
}
