import type { ProblemPhoto } from './types'

// `file` is a name in app/assets/problems/, or `guide/<name>` for a photo shared with the guide.
const assets = import.meta.glob<string>(['../../assets/problems/*.{jpg,jpeg,png,webp}', '../../assets/guide/*.{jpg,jpeg,png,webp}'], { eager: true, query: '?url', import: 'default' })
const urls: Record<string, string> = Object.fromEntries(
  Object.entries(assets).map(([path, url]) => {
    const [folder, name] = path.split('/').slice(-2) as [string, string]
    return [folder === 'problems' ? name : `${folder}/${name}`, url]
  })
)

export const problemPhotoUrl = (file: string): string | undefined => urls[file]

const BY_SA_2 = 'https://creativecommons.org/licenses/by-sa/2.0'
const BY_SA_3 = 'https://creativecommons.org/licenses/by-sa/3.0'
const BY_SA_4 = 'https://creativecommons.org/licenses/by-sa/4.0/'
const BY_4 = 'https://creativecommons.org/licenses/by/4.0/'
const PD = 'https://creativecommons.org/publicdomain/mark/1.0/'

export const PROBLEM_PHOTOS: Record<string, ProblemPhoto[]> = {
  n_def: [
    { file: 'guide/deficiency-nitrogen.jpg', caption: 'Young cannabis plant yellowing from the lower leaves up', author: 'Cannabis Training University', license: 'CC BY-SA 3.0', licenseUrl: BY_SA_3, sourceUrl: 'https://commons.wikimedia.org/wiki/File:Cannabis_Nutrient_Deficiency.JPG' }
  ],
  p_def: [
    { file: 'guide/problems-phosphorus-leaves.webp', caption: 'Cannabis leaves from well fed (left) to short of phosphorus: darker and duller', author: 'Llewellyn et al. (Plants 2023)', license: 'CC BY 4.0', licenseUrl: BY_4, sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9920212/' }
  ],
  k_def: [
    { file: 'guide/deficiency-potassium.jpg', caption: 'Potassium deficiency on a tomato leaf: yellow, then brown edges', author: 'Goldlocki', license: 'CC BY-SA 3.0', licenseUrl: `${BY_SA_3}/`, sourceUrl: 'https://commons.wikimedia.org/wiki/File:Tomate_Blatt_Kalimangel.jpg' }
  ],
  mg_def: [
    { file: 'guide/nutrition-magnesium-leaf.webp', caption: 'Cannabis leaf yellowing between green veins', author: 'plant-test-01 (Roboflow Universe user)', license: 'Public domain', licenseUrl: PD, sourceUrl: 'https://universe.roboflow.com/plant-test-01/plant-2lxth' },
    { file: 'guide/deficiency-magnesium.jpg', caption: 'The same pattern on alder buckthorn: older leaves yellow first', author: 'Karduelis', license: 'Public domain', licenseUrl: PD, sourceUrl: 'https://commons.wikimedia.org/wiki/File:Frangula_alnus_with_magnesium_deficiency.jpg' }
  ],
  nutrient_burn: [
    { file: 'guide/nutrient-burn.jpg', caption: 'Burnt brown spots and tips on an overfed cannabis leaf', author: 'Fenrisulfir', license: 'CC BY-SA 3.0', licenseUrl: BY_SA_3, sourceUrl: 'https://commons.wikimedia.org/wiki/File:Fertilizer-Burn.jpg' }
  ],
  n_toxicity: [
    { file: 'guide/nutrition-ammonium-burn.webp', caption: 'Cannabis fed too much ammonium: dark leaves curling and scorching', author: 'Saloner & Bernstein (Front. Plant Sci. 2022)', license: 'CC BY 4.0', licenseUrl: BY_4, sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9198551/' }
  ],
  spider_mites: [
    { file: 'guide/spider-mites.jpg', caption: 'Fine pale speckling from spider mites on a cannabis leaf', author: 'Rikva at Dutch Wikipedia', license: 'Public domain', licenseUrl: PD, sourceUrl: 'https://commons.wikimedia.org/wiki/File:Spint_op_Cannabis_Sativa.jpg' },
    { file: 'guide/problems-mites-macro.webp', caption: 'Two-spotted spider mites close up on a leaf', author: 'Dr. Guido Bohne', license: 'CC BY-SA 4.0', licenseUrl: BY_SA_4, sourceUrl: 'https://www.inaturalist.org/observations/28423664' }
  ],
  thrips: [
    { file: 'guide/problems-thrips.webp', caption: 'Western flower thrips on a leaf', author: 'Dr. Guido Bohne', license: 'CC BY-SA 4.0', licenseUrl: BY_SA_4, sourceUrl: 'https://www.inaturalist.org/observations/28423778' }
  ],
  aphids: [
    { file: 'guide/problems-aphids.webp', caption: 'A colony of black bean aphids on a flower stalk', author: 'Igor Balashov', license: 'CC BY 4.0', licenseUrl: BY_4, sourceUrl: 'https://www.inaturalist.org/observations/126789840' }
  ],
  fungus_gnats: [
    { file: 'guide/fungus-gnat.jpg', caption: 'Adult fungus gnat', author: 'James K. Lindsey', license: 'CC BY-SA 3.0', licenseUrl: BY_SA_3, sourceUrl: 'https://commons.wikimedia.org/wiki/File:Fungus_gnat_from_Commanster,_Belgium_01.jpg' }
  ],
  powdery_mildew: [
    { file: 'guide/powdery-mildew.jpg', caption: 'White powdery coating on a leaf', author: 'Dmitry Brant', license: 'CC BY-SA 4.0', licenseUrl: BY_SA_4, sourceUrl: 'https://commons.wikimedia.org/wiki/File:Powdery_mildew_9.jpg' }
  ],
  botrytis: [
    { file: 'guide/bud-rot-botrytis.jpg', caption: 'Grey Botrytis mould on a rose bud', author: 'Flowersabc', license: 'CC BY-SA 2.0', licenseUrl: BY_SA_2, sourceUrl: 'https://commons.wikimedia.org/wiki/File:Botrytis_cinerea.jpg' }
  ],
  hermaphrodite: [
    { file: 'guide/problems-male-flowers.webp', caption: 'Male flowers (pollen sacs), the kind a hermie grows among its buds', author: 'Patrick Hacker', license: 'CC BY 4.0', licenseUrl: BY_4, sourceUrl: 'https://www.inaturalist.org/observations/309562460' }
  ]
}

export const photosFor = (id: string): ProblemPhoto[] => PROBLEM_PHOTOS[id] ?? []
