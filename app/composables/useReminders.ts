import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { planReminders } from '~/utils/reminders'

const CHANNEL = 'reminders'
const BASE_ID = 7000
const SPAN = 14

export const remindersSupported = () => Capacitor.isNativePlatform()

export async function requestReminderPermission(): Promise<boolean> {
  if (!remindersSupported()) return false
  const current = await LocalNotifications.checkPermissions()
  if (current.display === 'granted') return true
  const asked = await LocalNotifications.requestPermissions()
  return asked.display === 'granted'
}

async function cancelOurs() {
  const { notifications } = await LocalNotifications.getPending()
  const ours = notifications.filter(n => n.id >= BASE_ID && n.id < BASE_ID + 100)
  if (ours.length) await LocalNotifications.cancel({ notifications: ours.map(n => ({ id: n.id })) })
}

export async function syncReminders() {
  if (!remindersSupported()) return
  const { state, wateringStatus } = useGrow()
  await cancelOurs()
  if (!state.settings.reminders) return
  if ((await LocalNotifications.checkPermissions()).display !== 'granted') return

  const plants = state.plants
    .filter(p => !p.archived)
    .map(p => ({ id: p.id, name: p.name, nextWater: wateringStatus(p)?.nextDate ?? null, interval: p.wateringInterval }))
  const tasks = state.tasks.map(t => ({ title: t.title, date: t.date, done: t.done }))
  const days = planReminders({ plants, tasks }, state.settings.reminderTime, new Date(), SPAN)

  const notifications = days.map((day, i) => {
    const names = day.water.map(w => w.name)
    const tasksText = day.tasks.length ? translate('reminders.tasks', { n: day.tasks.length, first: day.tasks[0]! }) : ''
    const title = names.length
      ? translate('reminders.water', { n: names.length, names: names.join(', ') })
      : translate('reminders.tasksTitle', { n: day.tasks.length })
    const body = [names.length > 1 ? translate('reminders.plantsList', { names: names.join(', ') }) : '', tasksText].filter(Boolean).join(' · ')
    return {
      id: BASE_ID + i,
      title,
      body: body || title,
      channelId: CHANNEL,
      schedule: { at: day.at, allowWhileIdle: true },
      extra: { route: day.water.length === 1 && !day.tasks.length ? `/plants/${day.water[0]!.id}` : '/' }
    }
  })
  if (notifications.length) await LocalNotifications.schedule({ notifications })
}

export async function sendTestReminder() {
  if (!remindersSupported()) return
  await LocalNotifications.schedule({
    notifications: [{
      id: BASE_ID + 99,
      title: translate('reminders.testTitle'),
      body: translate('reminders.testBody'),
      channelId: CHANNEL,
      schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true },
      extra: { route: '/' }
    }]
  })
}

export async function initReminders(onOpen: (route: string) => void) {
  if (!remindersSupported()) return
  await LocalNotifications.createChannel({
    id: CHANNEL,
    name: translate('reminders.channel'),
    importance: 4,
    visibility: 1,
    lightColor: '#9BE36B'
  }).catch(() => {})
  await LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
    const route = e.notification.extra?.route
    if (typeof route === 'string') onOpen(route)
  })
}
