<script setup lang="ts">
import type { NutrientLine } from '~/utils/calc'

useHead({ title: 'Tools' })

const { state } = useGrow()

type Tool = 'nutrients' | 'vpd' | 'dli' | 'convert'
const tools: { id: Tool, label: string, icon: string }[] = [
  { id: 'nutrients', label: 'Nutrients', icon: 'i-tabler-flask' },
  { id: 'vpd', label: 'VPD', icon: 'i-tabler-temperature' },
  { id: 'dli', label: 'Light', icon: 'i-tabler-sun' },
  { id: 'convert', label: 'Convert', icon: 'i-tabler-arrows-exchange' }
]
const route = useRoute()
const tool = ref<Tool>((route.query.t as Tool) || 'nutrients')
watch(tool, t => navigateTo({ query: { t } }, { replace: true }))

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

// ── Nutrients ─────────────────────────────────────────────────────
// The recipe is a per-device convenience, so localStorage is fine here.
const litres = useLocalStorage('budbuddy:mix-litres', 10)
const strength = useLocalStorage('budbuddy:mix-strength', 100)
const lines = useLocalStorage<NutrientLine[]>('budbuddy:mix-lines', [
  { name: 'Grow A', dose: 2 },
  { name: 'Grow B', dose: 2 },
  { name: 'CalMag', dose: 1 }
])

const mix = computed(() => nutrientMix(lines.value.map((l: NutrientLine) => ({ name: l.name, dose: n(l.dose) })), n(litres.value), n(strength.value)))
const mixTotal = computed(() => round(mix.value.reduce((s, m) => s + m.total, 0), 1))

function addLine() {
  lines.value.push({ name: '', dose: 1 })
}
function removeLine(i: number) {
  lines.value.splice(i, 1)
}

const logPlant = ref<string>('')
const logOpen = ref(false)
const growingPlants = computed(() => state.plants.filter(p => !p.archived))
const prefill = computed(() => ({
  nutrients: mix.value.map(m => `${m.name} ${m.dosePerLitre} ml/L`).join(', ')
}))

function logMix() {
  if (!logPlant.value && growingPlants.value[0]) logPlant.value = growingPlants.value[0].id
  if (logPlant.value) logOpen.value = true
}

// ── VPD ───────────────────────────────────────────────────────────
const temp = useLocalStorage('budbuddy:vpd-temp', 25)
const rh = useLocalStorage('budbuddy:vpd-rh', 60)
const leafOffset = useLocalStorage('budbuddy:vpd-leaf', -2)
const vpdValue = computed(() => vpd(n(temp.value), Math.min(100, Math.max(0, n(rh.value))), n(leafOffset.value)))
const zone = computed(() => vpdZone(vpdValue.value))
const VPD_MAX = 2
const vpdBands = [
  { from: 0, to: 0.4, color: '#60a5fa' },
  { from: 0.4, to: 0.8, color: '#2dd4bf' },
  { from: 0.8, to: 1.2, color: '#7bc74d' },
  { from: 1.2, to: 1.6, color: '#f472b6' },
  { from: 1.6, to: 2, color: '#ef4444' }
]

// ── DLI ───────────────────────────────────────────────────────────
const ppfd = useLocalStorage('budbuddy:dli-ppfd', 600)
const hours = useLocalStorage('budbuddy:dli-hours', 18)
const targetDli = useLocalStorage('budbuddy:dli-target', 40)
const dliValue = computed(() => dli(n(ppfd.value), Math.min(24, n(hours.value))))
const neededPpfd = computed(() => ppfdForDli(n(targetDli.value), Math.min(24, n(hours.value))))
const lightPresets = [
  { label: 'Seedling', ppfd: 250, hours: 18 },
  { label: 'Veg', ppfd: 550, hours: 18 },
  { label: 'Flower', ppfd: 900, hours: 12 },
  { label: 'Auto', ppfd: 650, hours: 20 }
]

// ── Convert ───────────────────────────────────────────────────────
const gal = ref<number | ''>(5)
const lit = ref<number | ''>(round(gallonsToLitres(5), 1))
const fahr = ref<number | ''>(77)
const cels = ref<number | ''>(25)

function fromGal() {
  lit.value = gal.value === '' ? '' : round(gallonsToLitres(gal.value), 1)
}
function fromLit() {
  gal.value = lit.value === '' ? '' : round(litresToGallons(lit.value), 2)
}
function fromF() {
  cels.value = fahr.value === '' ? '' : round(fahrenheitToCelsius(fahr.value), 1)
}
function fromC() {
  fahr.value = cels.value === '' ? '' : round(celsiusToFahrenheit(cels.value), 1)
}
</script>

<template>
  <div>
    <AppHeader
      title="Tools"
      subtitle="Calculators for the grow room"
      icon="i-tabler-calculator"
    />
    <div class="page">
      <div
        class="segmented"
        role="tablist"
        aria-label="Tools"
      >
        <button
          v-for="t in tools"
          :key="t.id"
          type="button"
          role="tab"
          :aria-selected="tool === t.id"
          @click="tool = t.id"
        >
          <UIcon
            :name="t.icon"
            class="size-4"
          /> {{ t.label }}
        </button>
      </div>

      <!-- Nutrients -->
      <section
        v-if="tool === 'nutrients'"
        class="tool"
      >
        <p class="muted intro">
          Enter the dose from your nutrient schedule (ml per litre) and how much water you are mixing.
        </p>
        <div class="card pad form-stack">
          <div class="form-grid">
            <div class="field">
              <label
                class="field-label"
                for="mix-l"
              >Water (L)</label>
              <input
                id="mix-l"
                v-model.number="litres"
                class="input"
                type="number"
                inputmode="decimal"
                min="0"
                step="any"
              >
            </div>
            <div class="field">
              <label
                class="field-label"
                for="mix-s"
              >Strength (%)</label>
              <input
                id="mix-s"
                v-model.number="strength"
                class="input"
                type="number"
                inputmode="numeric"
                min="0"
                max="200"
                step="5"
              >
            </div>
          </div>
          <div class="chips">
            <button
              v-for="s in [25, 50, 75, 100]"
              :key="s"
              type="button"
              class="chip"
              :aria-pressed="strength === s"
              @click="strength = s"
            >
              {{ s }} %
            </button>
          </div>
        </div>

        <div class="card pad">
          <div class="section-head">
            <h2 class="section-title">
              Products
            </h2>
            <button
              type="button"
              class="link"
              @click="addLine"
            >
              <UIcon
                name="i-tabler-plus"
                class="size-4"
              /> Add product
            </button>
          </div>
          <div class="lines">
            <div
              v-for="(l, i) in lines"
              :key="i"
              class="line"
            >
              <input
                v-model="l.name"
                class="input"
                placeholder="Product"
                :aria-label="`Product ${i + 1} name`"
              >
              <div class="dose">
                <input
                  v-model.number="l.dose"
                  class="input"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="0.1"
                  :aria-label="`Product ${i + 1} dose in ml per litre`"
                >
                <span>ml/L</span>
              </div>
              <button
                type="button"
                class="icon-btn danger"
                :aria-label="`Remove product ${i + 1}`"
                @click="removeLine(i)"
              >
                <UIcon
                  name="i-tabler-x"
                  class="size-4"
                />
              </button>
            </div>
          </div>
        </div>

        <div class="card pad result">
          <h2 class="section-title block-title">
            <UIcon
              name="i-tabler-flask"
              class="size-5"
            /> Add to {{ n(litres) }} L
          </h2>
          <p
            v-if="!mix.length"
            class="muted"
          >
            Add at least one product.
          </p>
          <ul
            v-else
            class="mix"
          >
            <li
              v-for="m in mix"
              :key="m.name"
            >
              <span>{{ m.name }} <small class="muted">{{ m.dosePerLitre }} ml/L</small></span>
              <strong>{{ m.total }} ml</strong>
            </li>
            <li class="mix-total">
              <span>Total concentrate</span>
              <strong>{{ mixTotal }} ml</strong>
            </li>
          </ul>
          <p class="field-hint">
            Add products one at a time and stir between them. Adjust pH last.
          </p>
          <div
            v-if="growingPlants.length && mix.length"
            class="log-row"
          >
            <select
              v-model="logPlant"
              class="input"
              aria-label="Plant to log the feed for"
            >
              <option
                value=""
                disabled
              >
                Log this feed for…
              </option>
              <option
                v-for="p in growingPlants"
                :key="p.id"
                :value="p.id"
              >
                {{ p.name }}
              </option>
            </select>
            <button
              type="button"
              class="btn btn-primary"
              @click="logMix"
            >
              Log feed
            </button>
          </div>
        </div>
      </section>

      <!-- VPD -->
      <section
        v-else-if="tool === 'vpd'"
        class="tool"
      >
        <p class="muted intro">
          Vapour pressure deficit tells you how hard the air pulls water out of the leaves. Hitting the right range speeds up growth and prevents mould.
        </p>
        <div class="card pad form-stack">
          <div class="field">
            <label
              class="field-label"
              for="vpd-t"
            >Air temperature · {{ temp }} °C</label>
            <input
              id="vpd-t"
              v-model.number="temp"
              type="range"
              min="10"
              max="40"
              step="0.5"
              class="range"
            >
          </div>
          <div class="field">
            <label
              class="field-label"
              for="vpd-rh"
            >Relative humidity · {{ rh }} %</label>
            <input
              id="vpd-rh"
              v-model.number="rh"
              type="range"
              min="10"
              max="100"
              step="1"
              class="range"
            >
          </div>
          <div class="field">
            <label
              class="field-label"
              for="vpd-leaf"
            >Leaf offset · {{ leafOffset }} °C</label>
            <input
              id="vpd-leaf"
              v-model.number="leafOffset"
              type="range"
              min="-5"
              max="2"
              step="0.5"
              class="range"
            >
            <span class="field-hint">Leaves are usually 1–3 °C cooler than the air under LED lights.</span>
          </div>
        </div>

        <div
          class="card pad result big"
          :style="{ '--c': zone.color }"
        >
          <span class="big-label">Leaf VPD</span>
          <strong class="big-value">{{ round(vpdValue, 2) }} <small>kPa</small></strong>
          <span class="zone">{{ zone.label }}</span>
          <div
            class="vpd-scale"
            aria-hidden="true"
          >
            <span
              v-for="b in vpdBands"
              :key="b.from"
              :style="{ flex: b.to - b.from, background: b.color }"
            />
            <i :style="{ left: `${Math.min(100, (vpdValue / VPD_MAX) * 100)}%` }" />
          </div>
          <div
            class="vpd-ticks"
            aria-hidden="true"
          >
            <span>0</span><span>0.4</span><span>0.8</span><span>1.2</span><span>1.6</span><span>2.0</span>
          </div>
          <p class="advice">
            {{ zone.advice }}
          </p>
        </div>

        <div class="card pad">
          <h2 class="section-title block-title">
            Target ranges
          </h2>
          <table class="ref">
            <tbody>
              <tr><td>Clones & seedlings</td><td>0.4 – 0.8 kPa</td></tr>
              <tr><td>Vegetative</td><td>0.8 – 1.2 kPa</td></tr>
              <tr><td>Flowering</td><td>1.2 – 1.6 kPa</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- DLI -->
      <section
        v-else-if="tool === 'dli'"
        class="tool"
      >
        <p class="muted intro">
          Daily light integral is the total light a plant receives per day. Measure PPFD at canopy height with a meter or a phone app.
        </p>
        <div class="chips">
          <button
            v-for="p in lightPresets"
            :key="p.label"
            type="button"
            class="chip"
            @click="ppfd = p.ppfd; hours = p.hours"
          >
            {{ p.label }} · {{ p.ppfd }} / {{ p.hours }}h
          </button>
        </div>
        <div class="card pad form-grid">
          <div class="field">
            <label
              class="field-label"
              for="dli-p"
            >PPFD (µmol/m²/s)</label>
            <input
              id="dli-p"
              v-model.number="ppfd"
              class="input"
              type="number"
              inputmode="numeric"
              min="0"
              step="10"
            >
          </div>
          <div class="field">
            <label
              class="field-label"
              for="dli-h"
            >Light hours</label>
            <input
              id="dli-h"
              v-model.number="hours"
              class="input"
              type="number"
              inputmode="decimal"
              min="0"
              max="24"
              step="1"
            >
          </div>
        </div>
        <div
          class="card pad result big"
          style="--c: #fbbf24"
        >
          <span class="big-label">Daily light integral</span>
          <strong class="big-value">{{ round(dliValue, 1) }} <small>mol/m²/day</small></strong>
          <p class="advice">
            {{ dliAdvice(dliValue) }}
          </p>
        </div>
        <div class="card pad form-stack">
          <h2 class="section-title">
            Reverse: PPFD for a target
          </h2>
          <div class="field">
            <label
              class="field-label"
              for="dli-t"
            >Target DLI · {{ targetDli }} mol</label>
            <input
              id="dli-t"
              v-model.number="targetDli"
              type="range"
              min="5"
              max="65"
              step="1"
              class="range"
            >
          </div>
          <p class="reverse">
            You need about <strong>{{ Math.round(neededPpfd) }} µmol/m²/s</strong> for {{ hours }} h of light.
          </p>
        </div>
      </section>

      <!-- Convert -->
      <section
        v-else
        class="tool"
      >
        <div class="card pad form-stack">
          <h2 class="section-title">
            <UIcon
              name="i-tabler-bucket"
              class="size-5"
            /> Pot / reservoir volume
          </h2>
          <div class="convert">
            <div class="field">
              <label
                class="field-label"
                for="c-gal"
              >US gallons</label>
              <input
                id="c-gal"
                v-model.number="gal"
                class="input"
                type="number"
                inputmode="decimal"
                min="0"
                step="any"
                @input="fromGal"
              >
            </div>
            <UIcon
              name="i-tabler-arrows-exchange"
              class="size-5 muted swap"
            />
            <div class="field">
              <label
                class="field-label"
                for="c-l"
              >Litres</label>
              <input
                id="c-l"
                v-model.number="lit"
                class="input"
                type="number"
                inputmode="decimal"
                min="0"
                step="any"
                @input="fromLit"
              >
            </div>
          </div>
        </div>
        <div class="card pad form-stack">
          <h2 class="section-title">
            <UIcon
              name="i-tabler-temperature"
              class="size-5"
            /> Temperature
          </h2>
          <div class="convert">
            <div class="field">
              <label
                class="field-label"
                for="c-f"
              >°F</label>
              <input
                id="c-f"
                v-model.number="fahr"
                class="input"
                type="number"
                inputmode="decimal"
                step="any"
                @input="fromF"
              >
            </div>
            <UIcon
              name="i-tabler-arrows-exchange"
              class="size-5 muted swap"
            />
            <div class="field">
              <label
                class="field-label"
                for="c-c"
              >°C</label>
              <input
                id="c-c"
                v-model.number="cels"
                class="input"
                type="number"
                inputmode="decimal"
                step="any"
                @input="fromC"
              >
            </div>
          </div>
        </div>
        <div class="card pad">
          <h2 class="section-title block-title">
            Common pot sizes
          </h2>
          <table class="ref">
            <tbody>
              <tr
                v-for="g in [1, 2, 3, 5, 7, 10]"
                :key="g"
              >
                <td>{{ g }} gal</td><td>{{ round(gallonsToLitres(g), 1) }} L</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <EntrySheet
      v-if="logPlant"
      v-model:open="logOpen"
      :plant-id="logPlant"
      type="feed"
      :date="todayISO()"
      :prefill="prefill"
    />
  </div>
</template>

<style scoped>
.segmented button {
  font-size: 13px;
  padding: 0 4px;
}

.tool {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.intro {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
}

.pad {
  padding: 16px;
}

.block-title {
  margin-bottom: 12px;
}

.lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.line {
  display: grid;
  grid-template-columns: 1fr 112px 40px;
  gap: 8px;
  align-items: center;
}

.dose {
  position: relative;
}

.dose .input {
  padding-right: 44px;
}

.dose span {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 12px;
  color: var(--text-3);
  pointer-events: none;
}

.mix {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
}

.mix li {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 9px 0;
  border-bottom: 1px solid var(--line);
  font-size: 15px;
}

.mix strong {
  font-size: 17px;
  color: var(--accent);
}

.mix-total {
  border-bottom: 0 !important;
  font-weight: 700;
}

.mix-total strong {
  color: var(--text) !important;
}

.log-row {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.log-row select {
  flex: 1;
  min-width: 0;
}

.range {
  width: 100%;
  accent-color: var(--accent);
  height: 28px;
}

.result.big {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border-color: color-mix(in srgb, var(--c) 35%, transparent);
  background: linear-gradient(180deg, color-mix(in srgb, var(--c) 9%, var(--surface)), var(--surface));
}

.big-label {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-2);
}

.big-value {
  font-size: 44px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.big-value small {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-2);
}

.zone {
  margin-top: 2px;
  padding: 4px 12px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c) 18%, transparent);
  color: var(--c);
  font-weight: 700;
  font-size: 13px;
}

.vpd-scale {
  position: relative;
  display: flex;
  gap: 2px;
  width: 100%;
  height: 10px;
  margin-top: 18px;
}

.vpd-scale span {
  height: 100%;
  border-radius: 3px;
  opacity: 0.75;
}

.vpd-scale i {
  position: absolute;
  top: -5px;
  width: 4px;
  height: 20px;
  margin-left: -2px;
  border-radius: 2px;
  background: #fff;
  box-shadow: 0 0 0 2px var(--surface);
  transition: left 0.2s ease;
}

.vpd-ticks {
  display: flex;
  justify-content: space-between;
  width: 100%;
  margin-top: 6px;
  font-size: 10px;
  color: var(--text-3);
}

.advice {
  margin: 12px 0 0;
  font-size: 14px;
  color: var(--text-2);
  line-height: 1.5;
}

.ref {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.ref td {
  padding: 9px 0;
  border-top: 1px solid var(--line);
}

.ref tr:first-child td {
  border-top: 0;
}

.ref td:last-child {
  text-align: right;
  font-weight: 600;
}

.reverse {
  margin: 0;
  font-size: 15px;
  line-height: 1.5;
}

.reverse strong {
  color: var(--accent);
}

.convert {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  gap: 10px;
}

.swap {
  margin-bottom: 13px;
}
</style>
