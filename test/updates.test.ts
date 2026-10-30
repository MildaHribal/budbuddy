import { describe, expect, it } from 'vitest'
import { newerRelease, parseRelease } from '../app/utils/updates'

const release = (body: string, extra = {}) => ({
  body,
  html_url: 'https://github.com/MildaHribal/budbuddy/releases/tag/build-v1.3.0-120',
  assets: [{ name: 'BudBuddy-v1.3.0.apk', browser_download_url: 'https://github.com/MildaHribal/budbuddy/releases/download/x/BudBuddy-v1.3.0.apk' }],
  ...extra
})

describe('update check', () => {
  it('reads the version code CI writes into the release body', () => {
    expect(parseRelease(release('📱 BudBuddy\nversionName: 1.3.0\nversionCode: 2630312'))).toMatchObject({ version: '1.3.0', build: 2630312 })
  })

  it('offers only a newer build', () => {
    const r = release('versionName: 1.3.0\nversionCode: 2630312')
    expect(newerRelease(r, 2630311)?.version).toBe('1.3.0')
    expect(newerRelease(r, 2630312)).toBeNull()
  })

  it('ignores old releases without a code, drafts and foreign links', () => {
    expect(parseRelease(release('Download the apk'))).toBeNull()
    expect(parseRelease(release('versionName: 1\nversionCode: 5', { prerelease: true }))).toBeNull()
    expect(parseRelease(release('versionName: 1\nversionCode: 5', { assets: [{ name: 'a.apk', browser_download_url: 'https://evil.example/a.apk' }] }))).toBeNull()
  })
})
