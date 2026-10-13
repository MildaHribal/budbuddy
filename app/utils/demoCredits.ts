import credits from '../assets/demo/credits.json'

export interface PhotoCredit {
  file: string
  title: string
  author: string
  license: string
  licenseUrl: string | null
  sourceUrl: string
}

/** Wikimedia Commons attributions for the bundled demo photos. */
export const DEMO_PHOTO_CREDITS: PhotoCredit[] = credits

// generic shots plus real photos of the demo strains (nl-*, ww-*) from the strain catalogue
export type DemoPhoto = 'seedling-led' | 'seedling-sprout' | 'veg-coco' | 'canopy-scrog' | 'flower-plant' | 'trichomes' | 'drying'
  | 'nl-veg' | 'nl-flower' | 'nl-tent' | 'ww-bloom' | 'ww-flower' | 'ww-cured'

export const demoPhotoId = (slug: DemoPhoto) => `demo-${slug}`
