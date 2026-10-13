import { COMMUNITY_NAMESPACES, loadNamespaces, type LazyNamespace } from '~/composables/useI18n'

const COMMUNITY = [...COMMUNITY_NAMESPACES]
const ROUTES: [RegExp, LazyNamespace[]][] = [
  [/^\/guide(\/|$)/, ['guide', 'guideWidgets', 'guideArt']],
  [/^\/(community|u|plant|strains|challenges|auth|auth-callback|admin)(\/|$)/, COMMUNITY],
  // plant detail: sharing chip and sign-in; settings: account section and AI
  [/^\/(plants\/[^/]+|my_trees\/[^/]+)\/?$/, ['plant', 'auth']],
  [/^\/settings(\/|$)/, ['settings', 'ai', ...COMMUNITY]],
  [/^\/tools(\/|$)/, ['tools']],
  [/^\/stats(\/|$)/, ['stats']],
  [/^\/ai-assistant(\/|$)/, ['ai']],
  // timelapse, compare, Grow Wrapped and export (plus their entry points)
  [/^\/(tools|stats|compare|wrapped|plants\/[^/]+(\/(timelapse|export))?)\/?$/, ['review']]
]

export default defineNuxtRouteMiddleware(async (to) => {
  const needed = ROUTES.flatMap(([re, ns]) => (re.test(to.path) ? ns : []))
  if (!needed.length) return
  try {
    await loadNamespaces(needed)
  } catch {
    // Offline on the web before the chunk was cached: stay put instead of rendering raw keys.
    if (!navigator.onLine) {
      useNotify().notify(translate('common.crash.offline'), { tone: 'error', duration: 5000 })
      return abortNavigation()
    }
    // A failed import stays failed for this document, so load the page fresh.
    return reloadNuxtApp({ path: to.fullPath })
  }
})
