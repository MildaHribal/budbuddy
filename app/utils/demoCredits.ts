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

export type DemoPhoto = 'seedling-led' | 'seedling-sprout' | 'veg-coco' | 'veg-tent' | 'canopy-scrog'
  | 'flower-plant' | 'flower-cola' | 'trichomes' | 'drying' | 'jar'

export const demoPhotoId = (slug: DemoPhoto) => `demo-${slug}`
