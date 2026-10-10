// Photos live in IndexedDB as Blobs (works in browsers and in the Android
// WebView). Keeping them out of Preferences/localStorage avoids the ~5 MB quota
// that base64 photos used to blow through after a handful of pictures.

const DB_NAME = 'budbuddy'
const STORE = 'photos'

export interface StoredPhoto {
  id: string
  blob: Blob
  createdAt: string
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1)
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE, { keyPath: 'id' })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => {
        dbPromise = null
        reject(req.error)
      }
    })
  }
  return dbPromise
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(db => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    tx.oncomplete = () => resolve(req.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  }))
}

export const photoStore = {
  put(photo: StoredPhoto) {
    return run('readwrite', s => s.put(photo)).then(() => undefined)
  },
  get(id: string) {
    return run<StoredPhoto | undefined>('readonly', s => s.get(id))
  },
  delete(id: string) {
    return run('readwrite', s => s.delete(id)).then(() => undefined)
  },
  all() {
    return run<StoredPhoto[]>('readonly', s => s.getAll())
  },
  /** Atomically swaps the whole library (used by restore). */
  replaceAll(photos: StoredPhoto[]) {
    return openDb().then(db => new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      const store = tx.objectStore(STORE)
      store.clear()
      for (const p of photos) store.put(p)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    }))
  },
  clear() {
    return run('readwrite', s => s.clear()).then(() => undefined)
  }
}
