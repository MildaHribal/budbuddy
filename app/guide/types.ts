// Guide content model. Every user-visible string is bilingual.
export interface L10n { en: string, cs: string }

export type Environment = 'indoor' | 'outdoor' | 'greenhouse'
export type Medium = 'soil' | 'coco' | 'hydro'

export type Block
  = | { type: 'text', md: L10n } // light markdown: **bold**, *italic*, [link](/guide/id), lists
    | { type: 'callout', tone: 'tip' | 'warning' | 'info', title?: L10n, md: L10n }
    | { type: 'steps', items: { title: L10n, md: L10n }[] }
    | { type: 'compare', columns: { title: L10n, points: L10n[], glyph?: string }[] }
    | { type: 'table', head: L10n[], rows: L10n[][] }
  /** illustration component from app/components/guide/illustrations, or a photo in app/assets/guide */
    | { type: 'figure', illustration?: string, photo?: string, caption: L10n, credit?: string }
  /** interactive widget from app/components/guide/widgets (e.g. 'vpd', 'ph-availability') */
    | { type: 'interactive', widget: string, props?: Record<string, unknown>, caption?: L10n }
    | { type: 'quiz', questions: QuizQuestion[] }
    | { type: 'checklist', id: string, items: L10n[] }

export interface QuizQuestion {
  id: string
  q: L10n
  options: L10n[]
  correct: number
  explain: L10n
}

export interface Lesson {
  id: string
  title: L10n
  minutes: number
  /** only show for these setups; omitted = everyone */
  environments?: Environment[]
  media?: Medium[]
  blocks: Block[]
}

export interface Chapter {
  id: string
  order: number
  title: L10n
  summary: L10n
  /** BudBuddy glyph name from app/utils/glyphs.ts */
  glyph: string
  color: string
  lessons: Lesson[]
}
