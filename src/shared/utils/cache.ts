export interface CacheEntry<T> {
  value: T;
  expiry?: number; // timestamp in milliseconds
}

export class InMemoryCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private defaultTTL: number; // Time to live in milliseconds

  constructor(defaultTTL: number = 5 * 60 * 1000) { // Default 5 minutes
    this.defaultTTL = defaultTTL;

    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  set(key: string, value: T, ttl?: number): void {
    const expiry = ttl ? Date.now() + ttl : Date.now() + this.defaultTTL;
    this.cache.set(key, { value, expiry });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    this.cleanup(); // Clean up before returning size
    return this.cache.size;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return entry.expiry ? Date.now() > entry.expiry : false;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry && now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instances for different types of data
export const userCache = new InMemoryCache<any>(10 * 60 * 1000); // 10 minutes for users
export const generalCache = new InMemoryCache<any>(5 * 60 * 1000); // 5 minutes for general data
