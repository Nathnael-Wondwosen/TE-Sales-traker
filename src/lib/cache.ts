// Simple in-memory cache implementation
class CacheService {
  private static instance: CacheService;
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes default TTL

  private constructor() {
    // Clean up expired cache entries every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (value.expiry < now) {
          this.cache.delete(key);
        }
      }
    }, 60 * 1000); // Check every minute
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  // Get data from cache
  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if expired
    if (cached.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  // Set data in cache
  set(key: string, data: any, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { data, expiry });
  }

  // Delete data from cache
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // Clear all cache
  clear(): void {
    this.cache.clear();
  }

  // Get cache size
  size(): number {
    return this.cache.size;
  }
}

export default CacheService.getInstance();