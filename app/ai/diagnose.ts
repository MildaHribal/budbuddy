// Stub of the on-device photo classifier; the real one replaces this file.

export interface DiagHit {
  cls: string
  label: string
  p: number
  /** how well the class was validated on real cannabis photos */
  evidence: 'tested' | 'weak' | 'transfer-only'
}

export interface DiagResult {
  diag: DiagHit[]
  stage: { cls: string, label: string, p: number }[]
  /** problems the classifier cannot recognise */
  unsupported: string[]
  modelVersion: string
}

/** Resolves false when the model is not installed. */
export async function initClassifier(_baseUrl: string): Promise<boolean> {
  return false
}

/** `lang` selects the language of the labels. */
export async function diagnosePhoto(_img: Blob | HTMLImageElement | ImageBitmap, _k = 3, _lang: 'cs' | 'en' = 'cs'): Promise<DiagResult> {
  throw new Error('Photo classifier is not installed')
}
