// Environment area: weather places, sensors (BLE / Home Assistant / manual), readings and light measurements.
// Stored as the optional `environment` collection of GrowData so old saves load unchanged.

export interface WeatherPlace {
  id: string
  name: string
  /** region / country line from geocoding, empty for manual coordinates */
  detail: string
  /** rounded to 2 decimals (~1 km) – precise coordinates are never needed for a forecast */
  lat: number
  lon: number
}

export type SensorModel
  = | 'atc1441'
    | 'pvvx'
    | 'bthome'
    | 'govee-h5075'
    | 'govee-h5074'
    | 'govee-h5179'
    | 'switchbot-meter'
    | 'switchbot-outdoor'

export type SensorKind = 'ble' | 'ha' | 'manual'

/** what a sensor measures: the tent (global light schedule) or one plant */
export type EnvTarget = { type: 'tent' } | { type: 'plant', plantId: string }

export interface EnvSensor {
  id: string
  name: string
  kind: SensorKind
  model: SensorModel | null
  /** BLE device id (MAC on Android) */
  address: string
  /** Home Assistant entity ids */
  haTemp: string
  haHumidity: string
  target: EnvTarget
  createdAt: string
  /** ISO time of the last reading */
  lastSeen: string | null
  battery: number | null
}

/** Downsampled reading: averaged into a time bucket. Keys are short because there can be thousands. */
export interface EnvReading {
  /** sensor id */
  s: string
  /** bucket start, epoch ms */
  t: number
  /** °C */
  c: number | null
  /** % RH */
  h: number | null
  /** samples averaged into the bucket */
  n: number
}

export type LightType = 'sun' | 'led-white' | 'hps' | 'blurple' | 'cmh' | 'fluorescent'

export interface LightReading {
  id: string
  /** ISO date-time */
  at: string
  lux: number
  source: 'sensor' | 'manual'
  lightType: LightType
  /** µmol/m²/s estimate */
  ppfd: number
  hours: number
  /** mol/m²/day */
  dli: number
  heightCm: number | null
  plantId: string | null
  note: string
}

export interface EnvironmentData {
  places: WeatherPlace[]
  /** plant id → place id; outdoor/greenhouse plants without one use the first place */
  plantPlaces: Record<string, string>
  sensors: EnvSensor[]
  readings: EnvReading[]
  light: LightReading[]
  /** "placeId:YYYY-MM-DD" rain days already logged or dismissed */
  rainHandled: string[]
  /** alert keys the user dismissed */
  dismissed: string[]
}
