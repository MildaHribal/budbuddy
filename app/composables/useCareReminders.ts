// Local notifications for jar burping and daily drying checks (ids 7100–7199, beside useReminders' 7000–7099).
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { planBurpNotices, planDryNotices } from '~/utils/curing'

const BASE_ID = 7100
const MAX = 100

export async function syncCareReminders() {
  if (!Capacitor.isNativePlatform()) return
  const { state } = useGrow()
  const { notifications: pending } = await LocalNotifications.getPending()
  const ours = pending.filter(n => n.id >= BASE_ID && n.id < BASE_ID + MAX)
  if (ours.length) await LocalNotifications.cancel({ notifications: ours.map(n => ({ id: n.id })) })
  if (!state.settings.reminders || state.settings.demo) return
  if ((await LocalNotifications.checkPermissions()).display !== 'granted') return

  const plants = new Map(state.plants.filter(p => !p.archived).map(p => [p.id, p]))
  const jars = (state.cure?.jars ?? []).filter(j => plants.get(j.plantId)?.stage === 'curing')
  const label = (id: string) => {
    const j = jars.find(x => x.id === id)!
    return `${plants.get(j.plantId)!.name} ${j.label}`.trim()
  }
  const burps = planBurpNotices(jars).map(n => ({
    at: n.at,
    title: translate('careNotify.burpTitle', { n: n.jars.length, names: n.jars.map(label).join(', ') }),
    body: n.jars.length > 1 ? translate('careNotify.burpBodyList', { names: n.jars.map(label).join(', ') }) : translate('careNotify.burpBody'),
    route: '/tools?t=curing'
  }))

  const drying = [...plants.values()].filter(p => p.stage === 'drying')
  const checked = (id: string) => (state.cure?.checks ?? []).filter(c => c.plantId === id).map(c => c.date)
  const dry = planDryNotices(drying.map(p => ({ id: p.id, checkedDates: checked(p.id) })), state.settings.reminderTime).map(n => ({
    at: n.at,
    title: translate('careNotify.dryTitle', { n: n.plants.length, names: n.plants.map(id => plants.get(id)!.name).join(', ') }),
    body: translate('careNotify.dryBody'),
    route: n.plants.length === 1 ? `/plants/${n.plants[0]}` : '/tools?t=curing'
  }))

  const notifications = [...burps, ...dry]
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, MAX)
    .map((n, i) => ({
      id: BASE_ID + i,
      title: n.title,
      body: n.body,
      channelId: 'reminders',
      schedule: { at: n.at, allowWhileIdle: true },
      extra: { route: n.route }
    }))
  if (notifications.length) await LocalNotifications.schedule({ notifications })
}
