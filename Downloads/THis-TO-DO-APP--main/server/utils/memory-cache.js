export class MemoryTtlCache {
  constructor(defaultTtlMs = 30_000) {
    this.defaultTtlMs = defaultTtlMs;
    this.store = new Map();
  }

  get(key) {
    const record = this.store.get(key);
    if (!record) {
      return null;
    }

    if (record.expiresAt <= Date.now()) {
      this.store.delete(key);
      return null;
    }

    return record.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key) {
    this.store.delete(key);
  }

  clearByPrefix(prefix) {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }
}

