/** Eenvoudige in-memory rate limiter per sleutel (IP) met vast venster. */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private max: number,
    private windowMs: number,
  ) {}

  /** Telt een poging; geeft false terug als de limiet al bereikt is. */
  take(key: string, now = Date.now()): boolean {
    const e = this.hits.get(key);
    if (!e || e.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      this.prune(now);
      return true;
    }
    if (e.count >= this.max) return false;
    e.count += 1;
    return true;
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  private prune(now: number) {
    if (this.hits.size < 1000) return;
    for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
  }
}
