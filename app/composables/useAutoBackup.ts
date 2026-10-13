// Automatic backups into a user-chosen folder.
// Android: Storage Access Framework folder (BackupFolder plugin). Web: File System Access API where available.
// The settings are per device (Preferences), so a restored backup never points at another phone's folder.
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'
import { backupDate, backupFileName, defaultConfig, filesToPrune, isBackupFile, normalizeConfig, type AutoBackupConfig } from '~/utils/autoBackup'
import { BackupFolder } from '~/utils/backupFolder'

const KEY = 'budbuddy:autobackup'
const IDB = 'budbuddy-backup'

export interface BackupItem {
  id: string
  name: string
  size: number
  date: Date | null
}

export type BackupErrorCode = 'noFolder' | 'permission' | 'write' | 'busy'

export class BackupError extends Error {
  constructor(public code: BackupErrorCode, cause?: unknown) {
    super(code)
    this.name = 'BackupError'
    if (cause) this.cause = cause
  }
}

const config = ref<AutoBackupConfig>(defaultConfig())
const running = ref(false)
let loading: Promise<void> | null = null

const native = () => Capacitor.isNativePlatform()

// ── File System Access (web) ──────────────────────────────────────

interface DirHandle {
  name: string
  queryPermission(o: { mode: 'readwrite' }): Promise<PermissionState>
  requestPermission(o: { mode: 'readwrite' }): Promise<PermissionState>
  getFileHandle(name: string, o?: { create?: boolean }): Promise<{ getFile(): Promise<File>, createWritable(): Promise<{ write(d: string): Promise<void>, close(): Promise<void>, abort(): Promise<void> }> }>
  removeEntry(name: string): Promise<void>
  values(): AsyncIterable<{ kind: 'file' | 'directory', name: string, getFile?: () => Promise<File> }>
}

export const fsaSupported = () => !native() && typeof window !== 'undefined' && 'showDirectoryPicker' in window
export const autoBackupSupported = () => native() || fsaSupported()

function idb<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore('h')
    req.onerror = () => reject(req.error)
    req.onsuccess = () => {
      const tx = req.result.transaction('h', mode)
      const r = run(tx.objectStore('h'))
      r.onsuccess = () => resolve(r.result)
      r.onerror = () => reject(r.error)
      tx.oncomplete = () => req.result.close()
    }
  })
}

async function dirHandle(request: boolean): Promise<DirHandle> {
  const handle = await idb<DirHandle | undefined>('readonly', s => s.get('dir') as IDBRequest<DirHandle | undefined>)
  if (!handle) throw new BackupError('noFolder')
  let perm = await handle.queryPermission({ mode: 'readwrite' })
  if (perm !== 'granted' && request) perm = await handle.requestPermission({ mode: 'readwrite' })
  if (perm !== 'granted') throw new BackupError('permission')
  return handle
}

// ── Config ────────────────────────────────────────────────────────

function load(): Promise<void> {
  loading ??= Preferences.get({ key: KEY })
    .then(({ value }) => {
      config.value = normalizeConfig(value ? JSON.parse(value) : null)
    })
    .catch(() => {
      config.value = defaultConfig()
    })
  return loading
}

async function update(patch: Partial<AutoBackupConfig>) {
  await load()
  config.value = { ...config.value, ...patch }
  await Preferences.set({ key: KEY, value: JSON.stringify(config.value) })
}

async function pickFolder(): Promise<boolean> {
  if (native()) {
    const r = await BackupFolder.pick()
    if (r.cancelled || !r.uri) return false
    await update({ target: { kind: 'saf', uri: r.uri, name: r.name ?? '' }, lastError: null })
    return true
  }
  if (!fsaSupported()) return false
  try {
    const picker = (window as unknown as { showDirectoryPicker(o: object): Promise<DirHandle> }).showDirectoryPicker
    const handle = await picker({ id: 'budbuddy-backup', mode: 'readwrite' })
    await idb('readwrite', s => s.put(handle, 'dir'))
    await update({ target: { kind: 'fsa', name: handle.name }, lastError: null })
    return true
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return false
    throw e
  }
}

/** Whether the folder is still writable (Android can lose the grant, browsers ask again after a restart). */
async function checkAccess(): Promise<boolean> {
  await load()
  const tgt = config.value.target
  if (!tgt) return false
  try {
    if (tgt.kind === 'saf') return (await BackupFolder.check({ uri: tgt.uri })).ok
    await dirHandle(false)
    return true
  } catch {
    return false
  }
}

// ── Backup / list / restore ───────────────────────────────────────

async function runBackup(opts: { interactive?: boolean } = {}): Promise<{ name: string }> {
  await load()
  const tgt = config.value.target
  if (!tgt) throw new BackupError('noFolder')
  if (running.value) throw new BackupError('busy')
  running.value = true
  const grow = useGrow()
  const name = backupFileName(new Date())
  const photos = config.value.photos
  try {
    let saved = name
    if (tgt.kind === 'saf') {
      // stage in the cache in pieces, then the plugin streams it into the folder
      let first = true
      let uri = ''
      await grow.exportBackup(async (chunk) => {
        if (first) {
          uri = (await Filesystem.writeFile({ path: name, data: chunk, directory: Directory.Cache, encoding: Encoding.UTF8 })).uri
          first = false
        } else {
          await Filesystem.appendFile({ path: name, data: chunk, directory: Directory.Cache, encoding: Encoding.UTF8 })
        }
      }, { photos })
      try {
        saved = (await BackupFolder.copyIn({ uri: tgt.uri, name, source: uri })).name || name
      } catch (e) {
        const ok = await BackupFolder.check({ uri: tgt.uri }).then(r => r.ok).catch(() => false)
        throw new BackupError(ok ? 'write' : 'permission', e)
      } finally {
        await Filesystem.deleteFile({ path: name, directory: Directory.Cache }).catch(() => {})
      }
      const { files } = await BackupFolder.list({ uri: tgt.uri }).catch(() => ({ files: [] }))
      for (const f of filesToPrune(files, config.value.keep)) await BackupFolder.remove({ uri: tgt.uri, id: f.id }).catch(() => {})
    } else {
      const dir = await dirHandle(!!opts.interactive)
      const file = await dir.getFileHandle(name, { create: true })
      const out = await file.createWritable()
      try {
        await grow.exportBackup(chunk => out.write(chunk), { photos })
        await out.close()
      } catch (e) {
        await out.abort().catch(() => {})
        throw new BackupError('write', e)
      }
      const names: { name: string }[] = []
      for await (const entry of dir.values()) if (entry.kind === 'file') names.push({ name: entry.name })
      for (const f of filesToPrune(names, config.value.keep)) await dir.removeEntry(f.name).catch(() => {})
    }
    await update({ lastAt: new Date().toISOString(), lastError: null, lastName: saved })
    return { name: saved }
  } catch (e) {
    const err = e instanceof BackupError ? e : new BackupError('write', e)
    if (err.code !== 'busy') await update({ lastError: err.code })
    throw err
  } finally {
    running.value = false
  }
}

async function listBackups(opts: { interactive?: boolean } = {}): Promise<BackupItem[]> {
  await load()
  const tgt = config.value.target
  if (!tgt) throw new BackupError('noFolder')
  let items: BackupItem[] = []
  if (tgt.kind === 'saf') {
    const { files } = await BackupFolder.list({ uri: tgt.uri }).catch((e) => {
      throw new BackupError('permission', e)
    })
    items = files.filter(f => isBackupFile(f.name)).map(f => ({ id: f.id, name: f.name, size: f.size, date: backupDate(f.name, f.modified) }))
  } else {
    const dir = await dirHandle(!!opts.interactive)
    for await (const entry of dir.values()) {
      if (entry.kind !== 'file' || !isBackupFile(entry.name) || !entry.getFile) continue
      const f = await entry.getFile()
      items.push({ id: entry.name, name: entry.name, size: f.size, date: backupDate(entry.name, f.lastModified) })
    }
  }
  return items.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
}

async function readBackup(item: BackupItem): Promise<string> {
  const tgt = config.value.target
  if (!tgt) throw new BackupError('noFolder')
  if (tgt.kind === 'saf') {
    const dest = 'restore-backup.json'
    await BackupFolder.copyOut({ uri: tgt.uri, id: item.id, dest })
    try {
      const { data } = await Filesystem.readFile({ path: dest, directory: Directory.Cache, encoding: Encoding.UTF8 })
      return typeof data === 'string' ? data : await data.text()
    } finally {
      await Filesystem.deleteFile({ path: dest, directory: Directory.Cache }).catch(() => {})
    }
  }
  const dir = await dirHandle(true)
  return (await (await dir.getFileHandle(item.name)).getFile()).text()
}

function markManualBackup() {
  update({ lastManualAt: new Date().toISOString() }).catch(() => {})
}

export function useAutoBackup() {
  return { config: readonly(config), running: readonly(running), load, update, pickFolder, checkAccess, runBackup, listBackups, readBackup, markManualBackup }
}
