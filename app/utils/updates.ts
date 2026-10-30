export interface Release { version: string, build: number, apkUrl: string, pageUrl: string }

interface GithubRelease {
  draft?: boolean
  prerelease?: boolean
  body?: string | null
  html_url?: string
  assets?: { name?: string, browser_download_url?: string }[]
}

/** CI writes "versionCode: <n>" and "versionName: <v>" into every release body. */
export function parseRelease(r: GithubRelease): Release | null {
  if (!r || r.draft || r.prerelease) return null
  const build = Number(/versionCode:\s*(\d+)/.exec(r.body ?? '')?.[1])
  const version = /versionName:\s*([\w.-]+)/.exec(r.body ?? '')?.[1]
  const apk = r.assets?.find(a => a.name?.endsWith('.apk') && a.browser_download_url?.startsWith('https://github.com/'))
  if (!build || !version || !apk?.browser_download_url) return null
  const pageUrl = r.html_url?.startsWith('https://github.com/') ? r.html_url : apk.browser_download_url
  return { version, build, apkUrl: apk.browser_download_url, pageUrl }
}

export function newerRelease(r: GithubRelease, currentBuild: number): Release | null {
  const rel = parseRelease(r)
  return rel && rel.build > currentBuild ? rel : null
}
