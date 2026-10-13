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

const BY_SA_3 = 'https://creativecommons.org/licenses/by-sa/3.0'
const BY_SA_4 = 'https://creativecommons.org/licenses/by-sa/4.0/'
const BY_4 = 'https://creativecommons.org/licenses/by/4.0/'
const PD = 'https://creativecommons.org/publicdomain/mark/1.0/'

export const PROBLEM_PHOTOS: Record<string, ProblemPhoto[]> = {
  n_def: [
    { file: 'n_def-1.webp', caption: 'Nitrogen deficiency (advanced): lower fan leaves turn uniformly pale yellow while the top stays green', author: 'Cockson, Landis, Smith, Hicks & Whipker 2019, Appl. Sci. 9:4432, Fig. 2 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/app9204432' },
    { file: 'n_def-2.webp', caption: 'Nitrogen deficiency progression on fan leaves, from mild (top) to severe whole-leaf yellowing (bottom)', author: 'Llewellyn, Golem, Jones & Zheng 2023, Plants 12:422, Fig. 2b (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/plants12030422' },
    { file: 'n_def-3.webp', caption: 'Severe nitrogen deficiency in flower: most fan leaves yellowed or dropped from the bottom up', author: 'Llewellyn, Golem, Jones & Zheng 2023, Plants 12:422, Fig. 2d (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/plants12030422' },
    { file: 'guide/deficiency-nitrogen.jpg', caption: 'Young cannabis plant yellowing from the lower leaves up', author: 'Cannabis Training University', license: 'CC BY-SA 3.0', licenseUrl: BY_SA_3, sourceUrl: 'https://commons.wikimedia.org/wiki/File:Cannabis_Nutrient_Deficiency.JPG' }
  ],
  p_def: [
    { file: 'p_def-1.webp', caption: 'Phosphorus deficiency (advanced): older leaves with dark, bronzed and dying patches', author: 'Cockson, Landis, Smith, Hicks & Whipker 2019, Appl. Sci. 9:4432, Fig. 2 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/app9204432' },
    { file: 'p_def-2.webp', caption: 'Phosphorus deficiency: dull, dark fan leaves with brown necrotic spots spreading from the leaflets', author: 'Llewellyn, Golem, Jones & Zheng 2023, Plants 12:422, Fig. 3c (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/plants12030422' },
    { file: 'guide/problems-phosphorus-leaves.webp', caption: 'Cannabis leaves from well fed (left) to short of phosphorus: darker and duller', author: 'Llewellyn et al. (Plants 2023)', license: 'CC BY 4.0', licenseUrl: BY_4, sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9920212/' }
  ],
  k_def: [
    { file: 'k_def-1.webp', caption: 'Potassium deficiency (advanced): yellowing that starts at leaflet margins and tips', author: 'Cockson, Landis, Smith, Hicks & Whipker 2019, Appl. Sci. 9:4432, Fig. 3 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/app9204432' },
    { file: 'k_def-2.webp', caption: 'Potassium deficiency mid-canopy: brown, scorched leaflet edges and tips on fan leaves', author: 'Llewellyn, Golem, Jones & Zheng 2023, Plants 12:422, Fig. 4c (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/plants12030422' }
  ],
  ca_def: [
    { file: 'ca_def-1.webp', caption: 'Calcium deficiency (advanced): distorted new growth with necrotic leaf margins', author: 'Cockson, Landis, Smith, Hicks & Whipker 2019, Appl. Sci. 9:4432, Fig. 2 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/app9204432' },
    { file: 'ca_def-2.webp', caption: 'Calcium deficiency (intermediate): new leaves twisted and crinkled with pale, dying edges', author: 'Cockson, Landis, Smith, Hicks & Whipker 2019, Appl. Sci. 9:4432, Fig. 2 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/app9204432' }
  ],
  mg_def: [
    { file: 'mg_def-1.webp', caption: 'Magnesium deficiency: interveinal yellowing on a fan leaf while the veins stay green', author: 'Cockson, Landis, Smith, Hicks & Whipker 2019, Appl. Sci. 9:4432, Fig. 3 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/app9204432' },
    { file: 'mg_def-2.webp', caption: 'Magnesium deficiency progression: interveinal chlorosis moving toward necrosis between midrib and margins', author: 'Llewellyn, Golem, Jones & Zheng 2023, Plants 12:422, Fig. 6c (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/plants12030422' },
    { file: 'mg_def-3.webp', caption: 'Magnesium deficiency (advanced): an old fan leaf turned yellow with blotchy necrosis', author: 'Cockson, Landis, Smith, Hicks & Whipker 2019, Appl. Sci. 9:4432, Fig. 3 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/app9204432' },
    { file: 'guide/nutrition-magnesium-leaf.webp', caption: 'Cannabis leaf yellowing between green veins', author: 'plant-test-01 (Roboflow Universe user)', license: 'Public domain', licenseUrl: PD, sourceUrl: 'https://universe.roboflow.com/plant-test-01/plant-2lxth' }
  ],
  s_def: [
    { file: 's_def-1.webp', caption: 'Sulfur deficiency: overall pale, yellow-green young growth across the canopy', author: 'Cockson, Landis, Smith, Hicks & Whipker 2019, Appl. Sci. 9:4432, Fig. 3 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/app9204432' },
    { file: 's_def-2.webp', caption: 'Sulfur deficiency progression on fan leaves, from healthy (left) to interveinal yellowing (right)', author: 'Llewellyn, Golem, Jones & Zheng 2023, Plants 12:422, Fig. 7c (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/plants12030422' }
  ],
  fe_def: [
    { file: 'fe_def-1.webp', caption: 'Iron deficiency: a young leaf turned pale yellow with faint green veins', author: 'Cockson, Landis, Smith, Hicks & Whipker 2019, Appl. Sci. 9:4432, Fig. 6 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/app9204432' },
    { file: 'fe_def-2.webp', caption: 'Iron deficiency (advanced): bleached, yellow new growth at the top of the plant', author: 'Cockson, Landis, Smith, Hicks & Whipker 2019, Appl. Sci. 9:4432, Fig. 6 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/app9204432' },
    { file: 'fe_def-3.webp', caption: 'Iron deficiency: mottled chlorosis in the centre of sugar leaves around a young flower', author: 'Llewellyn, Golem, Jones & Zheng 2023, Plants 12:422, Fig. 8b (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/plants12030422' }
  ],
  zn_def: [
    { file: 'zn_def-1.webp', caption: 'Zinc deficiency: young leaves with interveinal yellowing and narrow, wavy leaflets', author: 'Cockson, Landis, Smith, Hicks & Whipker 2019, Appl. Sci. 9:4432, Fig. 6 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/app9204432' },
    { file: 'zn_def-2.webp', caption: 'Zinc deficiency (advanced): yellow, twisted leaflets on new growth', author: 'Cockson, Landis, Smith, Hicks & Whipker 2019, Appl. Sci. 9:4432, Fig. 6 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/app9204432' }
  ],
  mn_def: [
    { file: 'mn_def-1.webp', caption: 'Manganese deficiency (advanced): mottled interveinal chlorosis with spotting on upper leaves', author: 'Cockson, Landis, Smith, Hicks & Whipker 2019, Appl. Sci. 9:4432, Fig. 4 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/app9204432' },
    { file: 'mn_def-2.webp', caption: 'Manganese deficiency (intermediate): pale interveinal mottling on younger fan leaves', author: 'Cockson, Landis, Smith, Hicks & Whipker 2019, Appl. Sci. 9:4432, Fig. 4 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/app9204432' }
  ],
  b_def: [
    { file: 'b_def-1.webp', caption: 'Boron deficiency: thick, deformed new growth with yellowing at the growing tip', author: 'Cockson, Landis, Smith, Hicks & Whipker 2019, Appl. Sci. 9:4432, Fig. 4 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/app9204432' },
    { file: 'b_def-2.webp', caption: 'Boron deficiency (advanced): growing tips die back and new leaves are brittle and distorted', author: 'Cockson, Landis, Smith, Hicks & Whipker 2019, Appl. Sci. 9:4432, Fig. 4 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/app9204432' }
  ],
  cu_def: [
    { file: 'cu_def-1.webp', caption: 'Copper deficiency: a dull, dark blue-green fan leaf with cupped leaflets', author: 'Cockson, Landis, Smith, Hicks & Whipker 2019, Appl. Sci. 9:4432, Fig. 4 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/app9204432' },
    { file: 'cu_def-2.webp', caption: 'Copper deficiency (advanced): new growth wilting with twisted, pale leaf tips', author: 'Cockson, Landis, Smith, Hicks & Whipker 2019, Appl. Sci. 9:4432, Fig. 4 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/app9204432' }
  ],
  nutrient_burn: [
    { file: 'nutrient_burn-1.webp', caption: 'Nutrient (fertilizer) burn: brown, scorched spots and margins on a cannabis leaflet', author: 'Fenrisulfir', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Fertilizer-Burn.jpg' },
    { file: 'guide/nutrient-burn.jpg', caption: 'Burnt brown spots and tips on an overfed cannabis leaf', author: 'Fenrisulfir', license: 'CC BY-SA 3.0', licenseUrl: BY_SA_3, sourceUrl: 'https://commons.wikimedia.org/wiki/File:Fertilizer-Burn.jpg' }
  ],
  yellowing_wilting: [
    { file: 'yellowing_wilting-1.webp', caption: 'Young cannabis plant with general yellowing of the fan leaves', author: 'Cannabis Training University', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Cannabis_Nutrient_Deficiency.JPG' }
  ],
  cold_stress: [
    { file: 'cold_stress-1.webp', caption: 'Cold damage on a cucumber plant at 9 °C: limp, darkened leaves (not cannabis)', author: 'Schlaghecken Josef', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Gurken_K%C3%A4lteschaden_bei_9%C2%B0C,_Josef_Schlaghecken.jpg' }
  ],
  hermaphrodite: [
    { file: 'hermaphrodite-1.webp', caption: 'Hermaphrodite: clusters of yellow male anthers ("bananas") forming inside a female flower', author: 'Punja & Holmes 2020, Front. Plant Sci. 11:718, Fig. 3 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3389/fpls.2020.00718' },
    { file: 'hermaphrodite-2.webp', caption: 'Hermaphrodite: masses of anthers replacing the female flower tissue', author: 'Punja & Holmes 2020, Front. Plant Sci. 11:718, Fig. 3 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3389/fpls.2020.00718' },
    { file: 'hermaphrodite-3.webp', caption: 'Hermaphrodite (late): dried anthers with the typical banana shape among the pistils', author: 'Punja & Holmes 2020, Front. Plant Sci. 11:718, Fig. 3 (panel cropped)', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3389/fpls.2020.00718' },
    { file: 'guide/problems-male-flowers.webp', caption: 'Male flowers (pollen sacs), the kind a hermie grows among its buds', author: 'Patrick Hacker', license: 'CC BY 4.0', licenseUrl: BY_4, sourceUrl: 'https://www.inaturalist.org/observations/309562460' }
  ],
  hlvd: [
    { file: 'hlvd-1.webp', caption: 'Hop latent viroid: stunted infected plant (left) beside a healthy one, and reduced, chlorotic flowers', author: 'Punja, Kahl, Reade et al. 2024, Int. J. Mol. Sci. 25:14, Fig. 8', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://doi.org/10.3390/ijms25010014' }
  ],
  spider_mites: [
    { file: 'spider_mites-1.webp', caption: 'Spider mites on cannabis: fine stippling on the leaf and visible webbing', author: 'Rikva at Dutch Wikipedia', license: 'Public domain', licenseUrl: 'https://creativecommons.org/publicdomain/mark/1.0/', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Spint_op_Cannabis_Sativa.jpg' },
    { file: 'spider_mites-2.webp', caption: 'Twospotted spider mite webbing on a cannabis plant', author: 'Whitney Cranshaw, Colorado State University, Bugwood.org', license: 'CC BY 3.0 US', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/us/', sourceUrl: 'https://www.ipmimages.org/browse/image/5569061' },
    { file: 'spider_mites-3.webp', caption: 'Twospotted spider mites on a cannabis leaf, close-up', author: 'Dr. Guido Bohne', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', sourceUrl: 'https://www.inaturalist.org/observations/28423664' },
    { file: 'spider_mites-4.webp', caption: 'Twospotted spider mite adults and eggs on a leaf underside (macro)', author: 'Mike Bowie', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://www.inaturalist.org/observations/92339870' },
    { file: 'guide/spider-mites.jpg', caption: 'Fine pale speckling from spider mites on a cannabis leaf', author: 'Rikva at Dutch Wikipedia', license: 'Public domain', licenseUrl: PD, sourceUrl: 'https://commons.wikimedia.org/wiki/File:Spint_op_Cannabis_Sativa.jpg' },
    { file: 'guide/problems-mites-macro.webp', caption: 'Two-spotted spider mites close up on a leaf', author: 'Dr. Guido Bohne', license: 'CC BY-SA 4.0', licenseUrl: BY_SA_4, sourceUrl: 'https://www.inaturalist.org/observations/28423664' }
  ],
  thrips: [
    { file: 'thrips-1.webp', caption: 'Thrips damage on cannabis: silvery feeding scars on fan leaflets', author: 'Whitney Cranshaw, Colorado State University, Bugwood.org', license: 'CC BY 3.0 US', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/us/', sourceUrl: 'https://www.ipmimages.org/browse/image/5569058' },
    { file: 'thrips-2.webp', caption: 'Thrips feeding scars and black specks of frass on cannabis leaves', author: 'Whitney Cranshaw, Colorado State University, Bugwood.org', license: 'CC BY 3.0 US', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/us/', sourceUrl: 'https://www.ipmimages.org/browse/image/5569059' },
    { file: 'thrips-3.webp', caption: 'Western flower thrips on a cannabis leaf, close-up', author: 'Dr. Guido Bohne', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', sourceUrl: 'https://www.inaturalist.org/observations/28423778' },
    { file: 'thrips-4.webp', caption: 'Western flower thrips, adult (macro)', author: 'Dave Kirkeby', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Frankliniella_occidentalis_7798.jpg' },
    { file: 'guide/problems-thrips.webp', caption: 'Western flower thrips on a leaf', author: 'Dr. Guido Bohne', license: 'CC BY-SA 4.0', licenseUrl: BY_SA_4, sourceUrl: 'https://www.inaturalist.org/observations/28423778' }
  ],
  aphids: [
    { file: 'aphids-1.webp', caption: 'Cannabis aphid colony on the underside of a cannabis leaf', author: 'Whitney Cranshaw, Colorado State University, Bugwood.org', license: 'CC BY 3.0 US', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/us/', sourceUrl: 'https://www.ipmimages.org/browse/image/5556184' },
    { file: 'aphids-2.webp', caption: 'Dense cannabis aphid colony with shed skins along a leaf vein', author: 'Whitney Cranshaw, Colorado State University, Bugwood.org', license: 'CC BY 3.0 US', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/us/', sourceUrl: 'https://www.ipmimages.org/browse/image/5565655' },
    { file: 'aphids-3.webp', caption: 'Cannabis aphids and shed white skins on the underside of a cannabis leaf', author: 'Whitney Cranshaw, Colorado State University, Bugwood.org', license: 'CC BY 3.0 US', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/us/', sourceUrl: 'https://www.ipmimages.org/browse/image/5576293' },
    { file: 'guide/problems-aphids.webp', caption: 'A colony of black bean aphids on a flower stalk', author: 'Igor Balashov', license: 'CC BY 4.0', licenseUrl: BY_4, sourceUrl: 'https://www.inaturalist.org/observations/126789840' }
  ],
  fungus_gnats: [
    { file: 'fungus_gnats-1.webp', caption: 'Fungus gnat (Bradysia) adult found in potting soil', author: 'Justin Williams', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://www.inaturalist.org/observations/345034130' },
    { file: 'fungus_gnats-2.webp', caption: 'Fungus gnat (Bradysia) adult, the common pest of wet potting mix', author: 'Justin Williams', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://www.inaturalist.org/observations/345034130' },
    { file: 'guide/fungus-gnat.jpg', caption: 'Adult fungus gnat', author: 'James K. Lindsey', license: 'CC BY-SA 3.0', licenseUrl: BY_SA_3, sourceUrl: 'https://commons.wikimedia.org/wiki/File:Fungus_gnat_from_Commanster,_Belgium_01.jpg' }
  ],
  whiteflies: [
    { file: 'whiteflies-1.webp', caption: 'Greenhouse whitefly adults on a leaf underside', author: 'Pablo Oliveri (Pro Huerta)', license: 'CC BY-SA 2.5', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.5', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Pro_Huerta_-_Cucurbita_maxima_var._zapallito_-_Trialeurodes_vaporariorum_04_adults.jpg' },
    { file: 'whiteflies-2.webp', caption: 'Greenhouse whitefly adult, close-up', author: 'Guido Bohne', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', sourceUrl: 'https://www.inaturalist.org/observations/22553105' }
  ],
  caterpillars: [
    { file: 'caterpillars-1.webp', caption: 'Caterpillar feeding on cannabis leaves', author: 'Whitney Cranshaw, Colorado State University, Bugwood.org', license: 'CC BY 3.0 US', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/us/', sourceUrl: 'https://www.ipmimages.org/browse/image/5556159' },
    { file: 'caterpillars-2.webp', caption: 'Corn earworm caterpillar boring into a cannabis bud', author: 'Whitney Cranshaw, Colorado State University, Bugwood.org', license: 'CC BY 3.0 US', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/us/', sourceUrl: 'https://www.ipmimages.org/browse/image/5576286' },
    { file: 'caterpillars-3.webp', caption: 'Caterpillar damage in a cannabis bud: chewed, browning flowers with frass', author: 'Whitney Cranshaw, Colorado State University, Bugwood.org', license: 'CC BY 3.0 US', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/us/', sourceUrl: 'https://www.ipmimages.org/browse/image/5576274' }
  ],
  mealybugs: [
    { file: 'mealybugs-1.webp', caption: 'Longtailed mealybug on a leaf: white waxy body with long tail filaments', author: 'Svavar Martin Andreasen', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://www.inaturalist.org/observations/252573788' },
    { file: 'mealybugs-2.webp', caption: 'Longtailed mealybug, close-up', author: 'no rights reserved', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', sourceUrl: 'https://www.inaturalist.org/observations/7668880' }
  ],
  leaf_miners: [
    { file: 'leaf_miners-1.webp', caption: 'Leaf miner on cannabis: pale winding tunnel inside a leaflet', author: 'Igor Balashov', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://www.inaturalist.org/observations/132786915' },
    { file: 'leaf_miners-2.webp', caption: 'Cannabis leaf miner (Liriomyza cannabis) mine on a cannabis leaf', author: 'Igor Balashov', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://www.inaturalist.org/observations/128420047' },
    { file: 'leaf_miners-3.webp', caption: 'Leaf miner larva visible inside its mine on a cannabis leaflet', author: 'Dr. Guido Bohne', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', sourceUrl: 'https://www.inaturalist.org/observations/229113571' }
  ],
  russet_broad_mites: [
    { file: 'russet_broad_mites-1.webp', caption: 'Hemp russet mite damage: upward-curled, dull and crinkled upper leaves', author: 'Whitney Cranshaw, Colorado State University, Bugwood.org', license: 'CC BY 3.0 US', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/us/', sourceUrl: 'https://www.ipmimages.org/browse/image/5574604' },
    { file: 'russet_broad_mites-2.webp', caption: 'Hemp russet mite damage on cannabis new growth, leaves cupping and bronzing', author: 'Whitney Cranshaw, Colorado State University, Bugwood.org', license: 'CC BY 3.0 US', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/us/', sourceUrl: 'https://www.ipmimages.org/browse/image/5574606' },
    { file: 'russet_broad_mites-3.webp', caption: 'Hemp russet mites massed along a cannabis leaf edge (macro)', author: 'Whitney Cranshaw, Colorado State University, Bugwood.org', license: 'CC BY 3.0 US', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/us/', sourceUrl: 'https://www.ipmimages.org/browse/image/5574608' }
  ],
  root_aphids: [
    { file: 'root_aphids-1.webp', caption: 'Rice root aphids, the root aphid found on cannabis', author: 'Whitney Cranshaw, Colorado State University, Bugwood.org', license: 'CC BY 3.0 US', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/us/', sourceUrl: 'https://www.ipmimages.org/browse/image/5596897' },
    { file: 'root_aphids-2.webp', caption: 'Winged rice root aphids caught on a yellow sticky card in a cannabis grow', author: 'Whitney Cranshaw, Colorado State University, Bugwood.org', license: 'CC BY 3.0 US', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/us/', sourceUrl: 'https://www.ipmimages.org/browse/image/5596891' }
  ],
  powdery_mildew: [
    { file: 'powdery_mildew-1.webp', caption: 'Powdery mildew on cannabis: white powdery patches on a fan leaf', author: 'Whitney Cranshaw, Colorado State University, Bugwood.org', license: 'CC BY 3.0 US', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/us/', sourceUrl: 'https://www.ipmimages.org/browse/image/5601935' },
    { file: 'powdery_mildew-2.webp', caption: 'Powdery mildew coating cannabis leaves with a white film', author: 'Eric Schmidt', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://www.inaturalist.org/observations/303165162' },
    { file: 'powdery_mildew-3.webp', caption: 'Powdery mildew on a squash leaf: dense white powdery patches (not cannabis)', author: 'Dmitry Brant', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Powdery_mildew_9.jpg' },
    { file: 'guide/powdery-mildew.jpg', caption: 'White powdery coating on a leaf', author: 'Dmitry Brant', license: 'CC BY-SA 4.0', licenseUrl: BY_SA_4, sourceUrl: 'https://commons.wikimedia.org/wiki/File:Powdery_mildew_9.jpg' }
  ],
  botrytis: [
    { file: 'botrytis-1.webp', caption: 'Botrytis (gray mold) growing on cannabis buds', author: 'Tim Sage', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', sourceUrl: 'https://www.inaturalist.org/observations/9190091' },
    { file: 'botrytis-2.webp', caption: 'Gray mold (Botrytis cinerea) with fuzzy spores on a cannabis bud', author: 'Tim Sage', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/', sourceUrl: 'https://www.inaturalist.org/observations/9190091' }
  ],
  septoria: [
    { file: 'septoria-1.webp', caption: 'Septoria leaf spot on tomato: small brown spots with pale centres (not cannabis)', author: 'B. Phalan', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://www.inaturalist.org/observations/195427704' },
    { file: 'septoria-2.webp', caption: 'Septoria leaf spot on tomato: many spots merging on an older leaf (not cannabis)', author: 'B. Phalan', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://www.inaturalist.org/observations/195427704' }
  ],
  fusarium_wilt: [
    { file: 'fusarium_wilt-1.webp', caption: 'Fusarium wilt on tobacco: one-sided yellowing and wilting of leaves (not cannabis)', author: 'R.J. Reynolds Tobacco Company Slide Set', license: 'CC BY 3.0 US', licenseUrl: 'https://creativecommons.org/licenses/by/3.0/us/deed.en', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Fusarium_wilt_symptom_tobacco.jpg' },
    { file: 'fusarium_wilt-2.webp', caption: 'Fusarium wilt on basil: stems collapsing and wilting (not cannabis)', author: 'no rights reserved', license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/', sourceUrl: 'https://www.inaturalist.org/observations/111986984' }
  ],
  n_toxicity: [
    { file: 'guide/nutrition-ammonium-burn.webp', caption: 'Cannabis fed too much ammonium: dark leaves curling and scorching', author: 'Saloner & Bernstein (Front. Plant Sci. 2022)', license: 'CC BY 4.0', licenseUrl: BY_4, sourceUrl: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9198551/' }
  ]
}

export const photosFor = (id: string): ProblemPhoto[] => PROBLEM_PHOTOS[id] ?? []
