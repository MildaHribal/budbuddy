import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { NOTIFY_BASE_ID, NOTIFY_SPAN } from '~/utils/gameUi'

// Shadow Grow notifications (ids 7400–7499). Re-planned after every game change; the sim loads only once the game was opened.
// Taps are routed by the shared listener in useReminders (extra.route).
const CHANNEL = 'game'
const CHANGED = 'budbuddy:game-changed'

export default defineNuxtPlugin(() => {
  if (!Capacitor.isNativePlatform()) return
  let channel = false

  async function replan() {
    const { useGame } = await import('~/composables/useGame')
    const game = useGame()
    const s = game.state.value
    const { notifications } = await LocalNotifications.getPending()
    const ours = notifications.filter(n => n.id >= NOTIFY_BASE_ID && n.id < NOTIFY_BASE_ID + NOTIFY_SPAN)
    if (ours.length) await LocalNotifications.cancel({ notifications: ours.map(n => ({ id: n.id })) })
    if (!s?.settings.notifications) return
    if ((await LocalNotifications.checkPermissions()).display !== 'granted') return
    if (!channel) {
      await LocalNotifications.createChannel({ id: CHANNEL, name: translate('game.notify.channel'), importance: 3, visibility: 1 }).catch(() => {})
      channel = true
    }
    const planned = game.plannedNotices()
    if (!planned.length) return
    await LocalNotifications.schedule({
      notifications: planned.map((n) => {
        const plant = n.plantId ? s.plants[n.plantId] : undefined
        const name = plant ? plant.label || game.strain(plant.strainId)?.name || '' : ''
        return {
          id: n.id,
          title: translate(`game.notify.${n.kind}.title`, { name }),
          body: translate(`game.notify.${n.kind}.body`, { name }),
          channelId: CHANNEL,
          schedule: { at: new Date(n.at), allowWhileIdle: true },
          extra: { route: n.route }
        }
      })
    })
  }

  const CLOCK_EVERY = 10 * 60_000
  let last = 0
  const run = useDebounceFn(() => {
    last = Date.now()
    replan().catch(e => console.warn('[Game] notifications', e))
  }, 2000)
  window.addEventListener(CHANGED, (e) => {
    // the clock moves every game hour; re-plan for that only now and then
    if ((e as CustomEvent).detail === 'clock' && Date.now() - last < CLOCK_EVERY) return
    run()
  })
})
