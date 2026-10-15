// Durable sprite storage for summoned critters. Magica CDN media may be deleted after ~30 days,
// so the image bytes are copied into IndexedDB (keyed by species id) and sprites resolve from
// there first, falling back to the remote URL, then the bundled PNG. The pure pieces take their
// dependencies as arguments so they can be unit-tested without a browser.

const DB_NAME = "critter-vale-sprites";
const STORE = "sprites";
const MAX_BYTES = 5 * 1024 * 1024;

/** IndexedDB key for a species id. */
export function spriteKey(id: string): string {
  return `sprite:${id}`;
}

/** Only http(s) URLs are worth fetching; blob:/data:/relative paths are already local. */
export function isRemoteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** Resolution order for a sprite: cached object URL, then the remote URL, then the bundled PNG. */
export function pickSpriteSource(id: string, objectUrl?: string, remoteUrl?: string): string {
  return objectUrl ?? remoteUrl ?? `/sprites/${id}.png`;
}

export interface SpriteStore {
  get(key: string): Promise<Blob | null>;
  put(key: string, blob: Blob): Promise<void>;
}

export interface CacheDeps {
  store: SpriteStore;
  fetchImpl: typeof fetch;
}

/**
 * Returns the sprite bytes for a species: from the store when present, else fetched from the
 * remote URL and stored. Returns null on any failure (CORS block, 404, bad type, storage error)
 * so the caller keeps using the remote URL.
 */
export async function loadOrCache(id: string, remoteUrl: string, deps: CacheDeps): Promise<Blob | null> {
  const key = spriteKey(id);
  try {
    const hit = await deps.store.get(key);
    if (hit) return hit;
  } catch {
    /* unreadable store: fall through to the network */
  }
  if (!isRemoteUrl(remoteUrl)) return null;
  try {
    const res = await deps.fetchImpl(remoteUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/") || blob.size === 0 || blob.size > MAX_BYTES) return null;
    try {
      await deps.store.put(key, blob);
    } catch {
      /* quota or private mode: still usable for this session */
    }
    return blob;
  } catch {
    return null; // CORS failure or offline
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** IndexedDB-backed store; every method rejects cleanly when IndexedDB is unavailable. */
export const idbStore: SpriteStore = {
  async get(key) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE).objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as Blob | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  },
  async put(key, blob) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};
