import credits from '../assets/demo/credits.json'

export interface PhotoCredit {
  file: string
  title: string
  author: string
  license: string
  licenseUrl: string | null
  sourceUrl: string
}

/** Attributions for the bundled demo photos. */
export const DEMO_PHOTO_CREDITS: PhotoCredit[] = credits

// cover shots plus a photo diary per demo plant (nl-*, sd-*, gg-*, ww-*)
export type DemoPhoto = 'seedling-led' | 'veg-coco' | 'drying' | 'nl-tent' | 'ww-bloom' | 'ww-flower' | 'ww-cured'
  | 'nl-sprout' | 'nl-seedling' | 'nl-leaves' | 'nl-topped' | 'nl-flip' | 'nl-stretch' | 'nl-early-bud' | 'nl-mid-flower' | 'nl-bud' | 'nl-trichome'
  | 'sd-clone' | 'sd-veg' | 'sd-topped' | 'gg-germ' | 'gg-sprout' | 'gg-leaves'

export const demoPhotoId = (slug: DemoPhoto) => `demo-${slug}`
