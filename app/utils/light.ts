import { locale } from './locale'

export interface LightState {
  isOn: boolean
  /** minutes until the lights switch */
  minutesLeft: number
  /** 0–1 position of `now` within the 24 h dial, 0 = lights-on */
  position: number
  onLabel: string
  offLabel: string
}

const DAY = 24 * 60

function parseHHMM(v: string): number {
  const [h = 0, m = 0] = v.split(':').map(Number)
  return h * 60 + m
}

function hhmm(min: number): string {
  const m = ((min % DAY) + DAY) % DAY
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
}

export function lightState(lightsOn: string, hours: number, now = new Date()): LightState {
  const on = parseHHMM(lightsOn)
  const lit = Math.max(0, Math.min(24, hours)) * 60
  const since = (((now.getHours() * 60 + now.getMinutes()) - on) % DAY + DAY) % DAY
  const isOn = lit === DAY || since < lit
  return {
    isOn: lit > 0 && isOn,
    minutesLeft: lit === DAY || lit === 0 ? 0 : isOn ? lit - since : DAY - since,
    position: since / DAY,
    onLabel: hhmm(on),
    offLabel: hhmm(on + lit)
  }
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  const unit = locale.value === 'cs' ? 'min' : 'm'
  return h ? `${h} h ${m} ${unit}` : `${m} ${unit}`
}
