import { describe, expect, it } from 'vitest'
import { backupDate, backupFileName, backupHealth, defaultConfig, filesToPrune, isAutoBackupName, isBackupFile, isDue, normalizeConfig } from '../app/utils/autoBackup'

const target = { kind: 'saf' as const, uri: 'content://tree/x', name: 'Drive' }

describe('auto backup', () => {
  it('names files so they sort by date', () => {
    const name = backupFileName(new Date(2026, 9, 3, 7, 5))
    expect(name).toBe('budbuddy-auto-2026-10-03-0705.json')
    expect(isAutoBackupName(name)).toBe(true)
    expect(isAutoBackupName('budbuddy-auto-2026-10-03-0705 (1).json')).toBe(true)
    expect(isAutoBackupName('budbuddy-backup-2026-10-03.json')).toBe(false)
    expect(backupDate(name)).toEqual(new Date(2026, 9, 3, 7, 5))
    expect(backupDate('budbuddy-backup-2026-10-03.json')?.getDate()).toBe(3)
    expect(backupDate('other.json', 1000)?.getTime()).toBe(1000)
    expect(isBackupFile('budbuddy-backup-2026-10-03.json')).toBe(true)
    expect(isBackupFile('photo.jpg')).toBe(false)
  })

  it('is due after the interval, never without a folder', () => {
    const now = new Date(2026, 9, 10, 12)
    const base = { ...defaultConfig(), enabled: true, target }
    expect(isDue(base, now)).toBe(true)
    expect(isDue({ ...base, lastAt: new Date(2026, 9, 9, 12).toISOString() }, now)).toBe(false)
    expect(isDue({ ...base, interval: 'daily', lastAt: new Date(2026, 9, 9, 12).toISOString() }, now)).toBe(true)
    // an hour of slack keeps a daily backup from creeping later
    expect(isDue({ ...base, interval: 'daily', lastAt: new Date(2026, 9, 9, 12, 30).toISOString() }, now)).toBe(true)
    expect(isDue({ ...base, lastAt: new Date(2026, 9, 3, 12).toISOString() }, now)).toBe(true)
    expect(isDue({ ...base, target: null }, now)).toBe(false)
    expect(isDue({ ...base, enabled: false }, now)).toBe(false)
  })

  it('keeps the newest N automatic backups and never prunes manual ones', () => {
    const files = ['budbuddy-auto-2026-10-01-0900.json', 'budbuddy-auto-2026-10-08-0900.json', 'budbuddy-backup-2026-09-01.json', 'budbuddy-auto-2026-10-15-0900.json', 'notes.txt']
      .map(name => ({ name }))
    expect(filesToPrune(files, 2).map(f => f.name)).toEqual(['budbuddy-auto-2026-10-01-0900.json'])
    expect(filesToPrune(files, 5)).toEqual([])
    expect(filesToPrune(files, 0).map(f => f.name)).toHaveLength(2)
  })

  it('reports backup health from the newest backup of any kind', () => {
    const now = new Date(2026, 9, 20, 12)
    expect(backupHealth(defaultConfig(), now).health).toBe('never')
    expect(backupHealth({ ...defaultConfig(), lastManualAt: new Date(2026, 9, 15).toISOString() }, now).health).toBe('ok')
    expect(backupHealth({ ...defaultConfig(), lastManualAt: new Date(2026, 9, 1).toISOString() }, now).health).toBe('stale')
    expect(backupHealth({ ...defaultConfig(), enabled: true, interval: 'daily', lastAt: new Date(2026, 9, 18, 12).toISOString() }, now).health).toBe('ok')
    expect(backupHealth({ ...defaultConfig(), enabled: true, interval: 'daily', lastAt: new Date(2026, 9, 16, 12).toISOString() }, now).health).toBe('stale')
  })

  it('normalises stored config', () => {
    expect(normalizeConfig(null)).toEqual(defaultConfig())
    const c = normalizeConfig({ enabled: true, interval: 'daily', keep: 10, photos: false, target, lastAt: 'bad' })
    expect(c).toMatchObject({ enabled: true, interval: 'daily', keep: 10, photos: false, target, lastAt: null })
    expect(normalizeConfig({ keep: 7, target: { kind: 'saf' } })).toMatchObject({ keep: 5, target: null })
  })
})
