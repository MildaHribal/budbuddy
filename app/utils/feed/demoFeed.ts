import { demoPhotoUrl } from '../demoPhotos'
import { DEMO_POST_PREFIX, type Author, type Category, type Comment, type Post } from './feed'

// Sample posts for the web demo garden: shown only in the browser, never stored anywhere.

const uuid = (n: number) => DEMO_POST_PREFIX + n.toString(16).padStart(12, '0')

const photo = (id: string) => {
  const url = demoPhotoUrl(`demo-${id}`)
  return url ? new URL(url, location.origin).href : null
}

const author = (n: number, username: string, display: string, reputation: number, firstGrow = false): Author =>
  ({ id: uuid(0x200 + n), username, display_name: display, avatar_url: null, reputation, first_grow: firstGrow })

const MIA = author(1, 'tentlife_mia', 'Mia', 1840)
const CARL = author(2, 'coco_carl', 'Carl', 960)
const ANA = author(3, 'organic_ana', 'Ana', 2410)
const LEE = author(4, 'lowstress_lee', 'Lee', 530)
const JO = author(5, 'jo_firstgrow', 'Jo', 40, true)
const SAM = author(6, 'balcony_sam', 'Sam', 310)

interface DemoComment { by: Author, body: string, h: number, likes?: number, reply?: number }
interface DemoPost {
  by: Author
  category: Category
  title: string
  body: string
  photos?: string[]
  h: number
  likes: number
  reactions?: Post['reactions']
  symptoms?: string[]
  context?: Post['plant_context']
  /** index of the accepted comment */
  accepted?: number
  comments?: DemoComment[]
}

const POSTS: DemoPost[] = [
  {
    by: MIA,
    category: 'plants',
    title: 'Day 49 in the 80x80, the net is finally full',
    body: 'Two weeks into flower. Topped once and tucked everything under the net during stretch. Running the LED at 75 % and the canopy is nice and even now.',
    photos: ['nl-tent'],
    h: 3,
    likes: 31,
    reactions: { like: 22, healthy: 6, training: 3 },
    comments: [
      { by: ANA, body: 'That canopy is so even. How many tops did you end up with?', h: 2, likes: 3 },
      { by: MIA, body: 'Eight main tops, the lower stuff got cleaned up at day 21.', h: 2, reply: 0, likes: 2 },
      { by: LEE, body: 'Saving this for my next run, the net at that height is exactly what I needed to see.', h: 1 }
    ]
  },
  {
    by: CARL,
    category: 'problem',
    title: 'Lower fan leaves going yellow in week 5 of flower',
    body: 'Started at the bottom about a week ago, the top still looks fine. Feeding Bio-Bloom 3 ml/L every second watering, runoff pH 6.3. Normal fade or should I bump the nitrogen?',
    h: 9,
    likes: 12,
    reactions: { like: 9, helpful: 3 },
    symptoms: ['yellowing'],
    context: { name: 'Northern Lights #1', strain: 'Northern Lights', type: 'photoperiod', stage: 'flowering', day: 68, dayInStage: 33, medium: 'soil', environment: 'indoor' },
    accepted: 0,
    comments: [
      { by: ANA, body: 'Bottom up and slow in week 5 is mostly the plant moving nitrogen into the buds. If it climbs past a third of the plant, add a little grow nutrient. Otherwise just pull the dead leaves.', h: 8, likes: 9 },
      { by: CARL, body: 'Makes sense, it stopped at the lowest two nodes. Leaving it alone. Thanks!', h: 6, reply: 0, likes: 1 }
    ]
  },
  {
    by: ANA,
    category: 'harvest',
    title: 'White Widow is done: 96 g dry from one 11 L pot',
    body: '16 weeks seed to jar in living soil. Dried 10 days at 60 % RH, now curing. Smells like pine and lemon, very frosty.',
    photos: ['ww-cured', 'ww-flower'],
    h: 26,
    likes: 48,
    reactions: { like: 35, frosty: 11, healthy: 2 },
    comments: [
      { by: SAM, body: 'Congrats! 96 g from one pot is great.', h: 25, likes: 2 },
      { by: MIA, body: 'Those trichomes. What did you use for the dry, a tent or a box?', h: 24, likes: 1 },
      { by: ANA, body: 'The veg tent with a hanging net, fan pointed at the wall, never at the buds.', h: 23, reply: 1, likes: 4 }
    ]
  },
  {
    by: SAM,
    category: 'question',
    title: 'How long do you dry before jarring?',
    body: 'First harvest is hanging since Monday. Small stems snap now but the big ones still bend. Jar now or wait?',
    photos: ['drying'],
    h: 30,
    likes: 9,
    reactions: { like: 6, helpful: 3 },
    accepted: 0,
    comments: [
      { by: ANA, body: 'Wait until the bigger stems snap too, usually 7 to 14 days. Then jar and burp daily for the first week.', h: 29, likes: 7 },
      { by: LEE, body: 'A hygrometer in the jar helps a lot, aim for 58 to 62 %.', h: 28, likes: 3 }
    ]
  },
  {
    by: JO,
    category: 'question',
    title: 'First seedling ever, did I plant it too deep?',
    body: 'Popped after 4 days but it looks short compared to videos. Planted about 1.5 cm deep in a peat pot. Should I worry?',
    photos: ['gg-sprout'],
    h: 5,
    likes: 14,
    reactions: { like: 11, healthy: 3 },
    comments: [
      { by: MIA, body: 'Looks healthy! Short and sturdy is what you want. A tall thin stem would mean the light is too far.', h: 4, likes: 5 },
      { by: JO, body: 'Oh good, thank you, I was about to move the lamp closer.', h: 4, reply: 0 }
    ]
  },
  {
    by: LEE,
    category: 'plants',
    title: 'Topped at the 4th node, two weeks later',
    body: 'Sour Diesel clone in coco. Recovered fast and the two new leaders are almost the same height. LST starts this weekend.',
    photos: ['sd-topped'],
    h: 50,
    likes: 19,
    reactions: { like: 13, training: 6 },
    comments: [
      { by: CARL, body: 'Nice and symmetrical. Coco clones really fly.', h: 48, likes: 1 }
    ]
  },
  {
    by: CARL,
    category: 'question',
    title: 'Cuttings from a 6 week old plant, too early?',
    body: 'I want to keep this Sour Diesel going. The plant is six weeks from seed and still in veg. Can I take clones now or should I wait for a bigger mother?',
    photos: ['sd-clone'],
    h: 1,
    likes: 2,
    reactions: { like: 2 }
  },
  {
    by: SAM,
    category: 'gear',
    title: 'Fabric pots vs plastic in a small tent',
    body: 'Switched to 11 L fabric pots this run. Roots look way better and I water more often, but the tent floor stays wetter. Anyone using saucers with fabric pots?',
    photos: ['seedling-led'],
    h: 70,
    likes: 11,
    reactions: { like: 8, helpful: 3 },
    comments: [
      { by: LEE, body: 'Saucers with a layer of clay pebbles, so the pot never sits in the runoff.', h: 68, likes: 4 },
      { by: MIA, body: 'Same here, plus a cheap boot tray under all of them.', h: 66, likes: 1 }
    ]
  }
]

export function demoFeed(now = Date.now()): { posts: Post[], comments: Map<string, Comment[]> } {
  const at = (h: number) => new Date(now - h * 3_600_000).toISOString()
  const posts: Post[] = []
  const comments = new Map<string, Comment[]>()
  POSTS.forEach((d, i) => {
    const id = uuid(0x100 + i)
    const list: Comment[] = (d.comments ?? []).map((c, j) => ({
      id: uuid(0x1000 + i * 0x10 + j),
      post_id: id,
      author_id: c.by.id,
      parent_id: c.reply === undefined ? null : uuid(0x1000 + i * 0x10 + c.reply),
      body: c.body,
      is_ai: false,
      likes_count: c.likes ?? 0,
      is_hidden: false,
      created_at: at(c.h),
      author: c.by
    }))
    comments.set(id, list)
    const acceptedId = d.accepted === undefined ? null : list[d.accepted]?.id ?? null
    posts.push({
      id,
      author_id: d.by.id,
      category: d.category,
      title: d.title,
      body: d.body,
      images: (d.photos ?? []).map(photo).filter((u): u is string => !!u),
      plant_id: null,
      plant_context: d.context ?? null,
      likes_count: d.likes,
      comments_count: list.length,
      accepted_comment_id: acceptedId,
      is_hidden: false,
      edited_at: null,
      created_at: at(d.h),
      author: d.by,
      plant: null,
      status: acceptedId ? 'solved' : d.category === 'question' || d.category === 'problem' ? 'open' : null,
      solved_at: acceptedId ? at(d.h - 1) : null,
      symptom_tags: d.symptoms ?? null,
      reactions: d.reactions ?? null,
      solver: acceptedId ? { author: { username: list[d.accepted!]!.author!.username } } : null
    })
  })
  return { posts, comments }
}
