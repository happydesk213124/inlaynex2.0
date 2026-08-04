/**
 * Bounded data-URL cache for gallery/sticky thumbs.
 *
 * Data URLs are huge strings; an unbounded Map makes sticky scroll swaps lag after
 * browsing many messages. Pin the sticky window so eviction never drops the shots
 * the overlay is about to show.
 */

export class BlobUrlCache {
  private readonly urls = new Map<string, string>();
  private readonly pinned = new Set<string>();
  private bytes = 0;

  constructor(private readonly budgetChars: number) {}

  get size(): number {
    return this.urls.size;
  }

  get byteLength(): number {
    return this.bytes;
  }

  get(id: string): string | undefined {
    const key = String(id || '');
    if (!key) return undefined;
    const url = this.urls.get(key);
    if (url === undefined) return undefined;
    // Map insertion order = LRU; re-insert on read.
    this.urls.delete(key);
    this.urls.set(key, url);
    return url;
  }

  set(id: string, url: string): void {
    const key = String(id || '');
    if (!key || typeof url !== 'string' || !url) return;
    const prev = this.urls.get(key);
    if (prev !== undefined) this.bytes -= prev.length;
    this.urls.delete(key);
    this.urls.set(key, url);
    this.bytes += url.length;
    this.evict();
  }

  drop(id: string): void {
    const key = String(id || '');
    const prev = this.urls.get(key);
    if (prev === undefined) return;
    this.urls.delete(key);
    this.bytes -= prev.length;
    this.pinned.delete(key);
  }

  /** Replace the protected id set. Pinned entries are never evicted for budget. */
  pin(ids: Iterable<unknown>): void {
    this.pinned.clear();
    for (const raw of ids) {
      const key = String(raw || '');
      if (!key) continue;
      this.pinned.add(key);
      const url = this.urls.get(key);
      if (url !== undefined) {
        this.urls.delete(key);
        this.urls.set(key, url);
      }
    }
    this.evict();
  }

  pinnedIds(): string[] {
    return [...this.pinned];
  }

  clear(): void {
    this.urls.clear();
    this.pinned.clear();
    this.bytes = 0;
  }

  private evict(): void {
    if (this.bytes <= this.budgetChars) return;
    for (const [id, url] of this.urls) {
      if (this.bytes <= this.budgetChars) break;
      if (this.pinned.has(id)) continue;
      this.urls.delete(id);
      this.bytes -= url.length;
    }
  }
}

/** ~32MB of data-URL characters — enough for a sticky window + recent browse. */
export const BLOB_URL_BUDGET_CHARS = 32 * 1024 * 1024;

export const blobUrlCache = new BlobUrlCache(BLOB_URL_BUDGET_CHARS);
