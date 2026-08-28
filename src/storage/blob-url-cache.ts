/**
 * Bounded display-URL cache for gallery/sticky/inline thumbs.
 *
 * The budget is source bytes, passed at `set`, not character length: a `blob:`
 * URL is a short string standing for a large buffer, so charging by string length
 * would let an unbounded amount of image data stay resident. `data:` URLs cost
 * roughly 4/3 of the bytes they are charged. Eviction revokes object URLs.
 */

function revokeDisplayUrl(url: string): void {
  if (typeof url !== 'string' || !url.startsWith('blob:')) return;
  if (typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* already revoked */
  }
}

export class BlobUrlCache {
  private readonly urls = new Map<string, string>();
  private readonly costs = new Map<string, number>();
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

  set(id: string, url: string, byteLen?: number): void {
    const key = String(id || '');
    if (!key || typeof url !== 'string' || !url) return;
    const prev = this.urls.get(key);
    const prevCost = this.costs.get(key);
    if (prev !== undefined && prev !== url) revokeDisplayUrl(prev);
    if (prev !== undefined) this.bytes -= prevCost ?? prev.length;
    this.urls.delete(key);
    this.urls.set(key, url);
    const cost = Number(byteLen) > 0 ? Math.round(Number(byteLen)) : url.length;
    this.costs.set(key, cost);
    this.bytes += cost;
    this.evict();
  }

  drop(id: string): void {
    const key = String(id || '');
    const prev = this.urls.get(key);
    if (prev === undefined) return;
    revokeDisplayUrl(prev);
    this.bytes -= this.costs.get(key) ?? prev.length;
    this.urls.delete(key);
    this.costs.delete(key);
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

  /**
   * Pin `ids` and drop every other cached URL immediately (not only when
   * over budget). Used when the explorer leaves a folder so prior thumbs do
   * not stay resident and re-lag the next visit.
   */
  retainOnly(ids: Iterable<unknown>): void {
    this.pin(ids);
    for (const id of [...this.urls.keys()]) {
      if (this.pinned.has(id)) continue;
      const url = this.urls.get(id);
      if (url !== undefined) revokeDisplayUrl(url);
      this.urls.delete(id);
      this.bytes -= this.costs.get(id) ?? url?.length ?? 0;
      this.costs.delete(id);
      this.pinned.delete(id);
    }
  }

  pinnedIds(): string[] {
    return [...this.pinned];
  }

  clear(): void {
    for (const url of this.urls.values()) revokeDisplayUrl(url);
    this.urls.clear();
    this.costs.clear();
    this.pinned.clear();
    this.bytes = 0;
  }

  private evict(): void {
    if (this.bytes <= this.budgetChars) return;
    for (const [id, url] of this.urls) {
      if (this.bytes <= this.budgetChars) break;
      if (this.pinned.has(id)) continue;
      revokeDisplayUrl(url);
      this.urls.delete(id);
      this.bytes -= this.costs.get(id) ?? url.length;
      this.costs.delete(id);
    }
  }
}

/**
 * 64MB of source image bytes — sticky window plus recent browsing without
 * re-baking as often after a first load. A bigger resident set trades encode
 * work for main-thread memory pressure.
 */
export const BLOB_URL_BUDGET_CHARS = 64 * 1024 * 1024;

export const blobUrlCache = new BlobUrlCache(BLOB_URL_BUDGET_CHARS);
