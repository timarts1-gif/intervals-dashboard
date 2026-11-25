interface Entry<T> {
  value: T;
  expiresAt: number;
}

/** Eenvoudige in-memory cache met TTL, om de Intervals.icu API te ontlasten. */
export class TtlCache {
  private store = new Map<string, Entry<unknown>>();

  constructor(private ttlMs: number) {}

  async getOrSet<T>(key: string, loader: () => Promise<T>): Promise<T> {
    const hit = this.store.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.value as T;
    const value = await loader();
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    return value;
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
