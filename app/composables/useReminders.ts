import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { addDays, todayISO } from '~/utils/date'
import { lightWindow, planNags, type NagItem } from '~/utils/nag'
import { planReminders } from '~/utils/reminders'

const CHANNEL = 'reminders'
const BASE_ID = 7000
const SPAN = 14
const NAG_ID = 7200
const NAG_MAX = 200
const NAG_DAYS = 3

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
  const ours = notifications.filter(n => (n.id >= BASE_ID && n.id < BASE_ID + 100) || (n.id >= NAG_ID && n.id < NAG_ID + NAG_MAX))
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
    .map((p) => {
      const w = wateringStatus(p)
      return { id: p.id, name: p.name, nextWater: w?.nextDate ?? null, interval: w?.interval ?? null }
    })
  const tasks = state.tasks.map(t => ({ title: t.title, date: t.date, done: t.done }))
  const nagging = state.settings.nag
  const nagEnd = addDays(todayISO(), NAG_DAYS - 1)
  const days = planReminders({ plants, tasks }, state.settings.reminderTime, new Date(), SPAN)
    .filter(d => !nagging || d.date > nagEnd)

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
  if (nagging) notifications.push(...nagNotifications(plants))
  if (notifications.length) await LocalNotifications.schedule({ notifications })
}

/** Lights-on window of a plant: its tent, the global tent schedule indoors, daylight otherwise. */
function plantWindow(plantId: string | null) {
  const { state } = useGrow()
  const plant = plantId ? state.plants.find(p => p.id === plantId) : undefined
  const space = plant?.spaceId ? state.spaces?.find(sp => sp.id === plant.spaceId) : undefined
  if (space) return lightWindow(space.lightsOn, space.lightHours)
  if (plant && plant.location !== 'indoor') return lightWindow(null, null)
  return lightWindow(state.settings.lightsOn, state.settings.lightHours)
}

function nagNotifications(plants: { id: string, name: string, nextWater: string | null }[]) {
  const { state } = useGrow()
  const items: NagItem[] = []
  for (const p of plants) {
    if (p.nextWater) items.push({ kind: 'water', id: p.id, label: p.name, due: p.nextWater, window: plantWindow(p.id), route: `/plants/${p.id}` })
  }
  for (const t of state.tasks) {
    if (!t.done) items.push({ kind: 'task', id: t.id, label: t.title, due: t.date, window: plantWindow(t.plantId), route: t.plantId ? `/plants/${t.plantId}` : '/' })
  }
  const slots = planNags(items, { everyHours: state.settings.nagEvery, quietNight: state.settings.nagQuiet, days: NAG_DAYS, max: NAG_MAX })
  return slots.map((slot, i) => {
    const n = slot.water.length
    const title = n
      ? translate('reminders.water', { n, names: slot.water.join(', ') })
      : translate('reminders.tasksTitle', { n: slot.tasks.length })
    const tasksText = slot.tasks.length ? translate('reminders.tasks', { n: slot.tasks.length, first: slot.tasks[0]! }) : ''
    const body = [n > 1 ? translate('reminders.plantsList', { names: slot.water.join(', ') }) : '', tasksText, translate('reminders.nagHint')].filter(Boolean).join(' · ')
    return {
      id: NAG_ID + i,
      title,
      body,
      channelId: CHANNEL,
      schedule: { at: slot.at, allowWhileIdle: true },
      extra: { route: slot.route }
    }
  })
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
