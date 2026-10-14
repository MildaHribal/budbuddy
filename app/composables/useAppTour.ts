import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { replayMode, startsFirstRun, TOUR_STEPS, tourPlant, type TourMode } from '~/utils/appTour'

const SEEN_KEY = 'budbuddy:app-tour'

const active = ref(false)
const index = ref(0)
const mode = ref<TourMode>('first')
/** light hours picked in the onboarding, kept if the grower starts an own garden at the end */
let keepLight: number | null = null

export function useAppTour() {
  const grow = useGrow()
  const { notify } = useNotify()
  const { t } = useI18n()

  const step = computed(() => TOUR_STEPS[index.value]!)

  function begin(m: TourMode) {
    mode.value = m
    index.value = 0
    active.value = true
    navigateTo('/')
  }

  /** Called when the native onboarding ends with the tour; does nothing unless this is a fresh install. */
  async function startFirstRun(opts: { lightHours?: number | null } = {}) {
    const seen = (await Preferences.get({ key: SEEN_KEY }).catch(() => ({ value: null }))).value === '1'
    const ok = startsFirstRun({
      native: Capacitor.isNativePlatform(),
      seen,
      troubled: !!grow.loadError.value || !!grow.recovered.value,
      settings: grow.state.settings,
      plants: grow.state.plants
    })
    if (!ok) return false
    keepLight = opts.lightHours ?? null
    await Preferences.set({ key: SEEN_KEY, value: '1' }).catch(() => {})
    begin('first')
    return true
  }

  async function replay() {
    if (active.value || grow.loadError.value) return
    const m = replayMode(grow.state)
    keepLight = null
    if (m === 'preview') await grow.previewDemo()
    begin(m)
  }

  /** Route of the step's page; null = stay (the bottom nav is on most pages). */
  function stepRoute(): string | null {
    const place = step.value.place
    if (place === 'home') return '/'
    if (place === 'plant') {
      const p = tourPlant(grow.state.plants)
      return p ? `/plants/${p.id}` : '/'
    }
    return null
  }

  function go(to: number) {
    if (to < 0 || to >= TOUR_STEPS.length) return
    index.value = to
  }

  async function close() {
    active.value = false
    if (mode.value === 'preview') {
      await grow.showSavedGarden()
      notify(t('tour.toast.back'))
    }
    await navigateTo('/')
    document.querySelector('.app-scroll')?.scrollTo({ top: 0 })
  }

  /** Skip: nothing is removed, the demo stays (its home note offers the way out). */
  async function skip() {
    const wasPreview = mode.value === 'preview'
    await close()
    if (!wasPreview && grow.state.settings.demo) {
      notify(t('tour.toast.skipped'), { tone: 'info', action: { label: t('tour.toast.own'), run: () => useOwnGarden()() } })
    }
  }

  async function startOwn() {
    active.value = false
    if (grow.preview.value) {
      await useOwnGarden()()
      return
    }
    await grow.startOwnGarden()
    if (keepLight != null) grow.updateSettings({ lightHours: keepLight })
    notify(t('showcase.own.done'))
    navigateTo('/')
  }

  return { active: readonly(active), index: readonly(index), mode: readonly(mode), step, total: TOUR_STEPS.length, stepRoute, go, startFirstRun, replay, skip, close, startOwn }
}
