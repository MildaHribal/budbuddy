import { loadNamespaces, type LazyNamespace } from '~/composables/useI18n'

const ROUTES: [RegExp, LazyNamespace[]][] = [
  [/^\/guide(\/|$)/, ['guide', 'guideWidgets', 'guideArt']]
]

export default defineNuxtRouteMiddleware(async (to) => {
  const needed = ROUTES.flatMap(([re, ns]) => (re.test(to.path) ? ns : []))
  if (needed.length) await loadNamespaces(needed)
})
