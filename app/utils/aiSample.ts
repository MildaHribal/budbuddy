import type { AssistantMessage } from '~/composables/useAssistant'
import { AI_MODEL } from '../../shared/aiModels'
import samplePhoto from '../assets/guide/deficiency-nitrogen.jpg?url'

// Static example chat for the website, where the assistant is switched off.
export function aiSampleChat(t: (key: string) => string, lang: 'en' | 'cs'): AssistantMessage[] {
  const cs = lang === 'cs'
  return [
    { id: 'sample-q1', role: 'user', text: t('ai.web.sample.q1'), thumb: samplePhoto, createdAt: '2026-10-12T21:12:00' },
    {
      id: 'sample-a1',
      role: 'assistant',
      text: t('ai.web.sample.a1'),
      createdAt: '2026-10-12T21:12:00',
      model: AI_MODEL,
      diag: [
        { cls: 'n_def', label: cs ? 'Nedostatek dusíku (N)' : 'Nitrogen (N) deficiency', p: 0.74, evidence: 'tested' },
        { cls: 'yellowing_wilting', label: cs ? 'Žloutnutí / vadnutí (nespecifické)' : 'Yellowing / wilting (non-specific)', p: 0.14, evidence: 'tested' },
        { cls: 'mg_def', label: cs ? 'Nedostatek hořčíku (Mg)' : 'Magnesium (Mg) deficiency', p: 0.06, evidence: 'tested' }
      ],
      sources: [
        { n: 1, title: t('ai.web.sample.src1'), kind: 'knowledge', snippet: t('ai.web.sample.src1Text') },
        { n: 2, title: t('ai.web.sample.src2'), kind: 'knowledge', snippet: t('ai.web.sample.src2Text') }
      ],
      guide: [{ chapter: 'problems', lesson: 'problems-deficiencies' }, { chapter: 'nutrition', lesson: 'nutrition-ph-ec' }]
    },
    { id: 'sample-q2', role: 'user', text: t('ai.web.sample.q2'), createdAt: '2026-10-12T21:14:00' },
    {
      id: 'sample-a2',
      role: 'assistant',
      text: t('ai.web.sample.a2'),
      createdAt: '2026-10-12T21:14:00',
      model: AI_MODEL,
      guide: [{ chapter: 'nutrition', lesson: 'nutrition-schedule' }, { chapter: 'nutrition', lesson: 'nutrition-overfeeding' }]
    }
  ]
}
