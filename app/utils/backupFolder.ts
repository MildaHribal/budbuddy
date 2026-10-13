import { registerPlugin } from '@capacitor/core'

export interface BackupFile {
  id: string
  name: string
  size: number
  /** ms since epoch */
  modified: number
}

/** Native side: android/app/src/main/java/eu/budbuddy/app/backup/BackupFolderPlugin.java (Storage Access Framework). */
export interface BackupFolderPlugin {
  pick(): Promise<{ cancelled: boolean, uri?: string, name?: string }>
  check(opts: { uri: string }): Promise<{ ok: boolean, name?: string }>
  copyIn(opts: { uri: string, name: string, source: string }): Promise<{ id: string, name: string }>
  list(opts: { uri: string }): Promise<{ files: BackupFile[] }>
  remove(opts: { uri: string, id: string }): Promise<void>
  copyOut(opts: { uri: string, id: string, dest: string }): Promise<{ path: string }>
}

export const BackupFolder = registerPlugin<BackupFolderPlugin>('BackupFolder')
