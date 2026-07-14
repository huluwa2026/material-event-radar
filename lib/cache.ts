interface CacheEntry<T> {
  expiresAt: number;
  value: Promise<T>;
}

export class TtlPromiseCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number) {}

  getOrCreate(key: string, factory: () => Promise<T>): Promise<T> {
    const existing = this.entries.get(key);
    if (existing && existing.expiresAt > Date.now()) return existing.value;

    const value = factory().catch((error) => {
      this.entries.delete(key);
      throw error;
    });

    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    return value;
  }

  clear(): void {
    this.entries.clear();
  }
}
