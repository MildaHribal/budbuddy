<script setup lang="ts">
import type { NutrientLine } from '~/utils/calc'

const { t } = useI18n()
useHead({ title: () => t('tools.title') })

const { state } = useGrow()

type Tool = 'nutrients' | 'vpd' | 'dli' | 'convert'
const tools = computed(() => (['nutrients', 'vpd', 'dli', 'convert'] as Tool[]).map(id => ({ id, label: t(`tools.tabs.${id}`) })))
const route = useRoute()
const TOOL_IDS: Tool[] = ['nutrients', 'vpd', 'dli', 'convert']
const queryTool = route.query.t as Tool
const tool = ref<Tool>(TOOL_IDS.includes(queryTool) ? queryTool : 'nutrients')
watch(tool, v => navigateTo({ query: { t: v } }, { replace: true }))

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const pos = (v: unknown) => Math.max(0, n(v))

// The explainer starts open only on the first visit to each tool, so the calculator stays above the fold.
const seenTools = useLocalStorage<string[]>('budbuddy:tools-seen', [])
const aboutOpen = ref(false)
watch(tool, (v) => {
  aboutOpen.value = !seenTools.value.includes(v)
  if (aboutOpen.value) seenTools.value = [...seenTools.value, v]
}, { immediate: true })
function onAboutToggle(e: Event) {
  aboutOpen.value = (e.target as HTMLDetailsElement).open
}

// ── Nutrients ─────────────────────────────────────────────────────
// The recipe is a per-device convenience, so localStorage is fine here.
const litres = useLocalStorage('budbuddy:mix-litres', 10)
const strength = useLocalStorage('budbuddy:mix-strength', 100)
const EXAMPLE: NutrientLine[] = [
  { name: 'Grow A', dose: 2 },
  { name: 'Grow B', dose: 2 },
  { name: 'CalMag', dose: 1 }
]
const lines = useLocalStorage<NutrientLine[]>('budbuddy:mix-lines', EXAMPLE.map(l => ({ ...l })))

const mix = computed(() => nutrientMix(lines.value.map((l: NutrientLine) => ({ name: l.name, dose: pos(l.dose) })), pos(litres.value), pos(strength.value)))
const mixTotal = computed(() => round(mix.value.reduce((s, m) => s + m.total, 0), 1))
const strengthLevels = [25, 50, 75, 100]

function useExample() {
  lines.value = EXAMPLE.map(l => ({ ...l }))
}
function addLine() {
  lines.value.push({ name: '', dose: 1 })
}
function removeLine(i: number) {
  lines.value.splice(i, 1)
}

const logPlant = ref<string>('')
const logOpen = ref(false)
const growingPlants = computed(() => state.plants.filter(isGrowing))
const prefill = computed(() => ({
  nutrients: mix.value.map(m => `${m.name} ${formatNumber(m.dosePerLitre, 2)} ml/L`).join(', ')
}))

function logMix() {
  if (!logPlant.value && growingPlants.value[0]) logPlant.value = growingPlants.value[0].id
  if (logPlant.value) logOpen.value = true
}

// "What is this for?" + "Learn more" per tool
const aboutNs: Record<Tool, string> = { nutrients: 'mix', vpd: 'vpd', dli: 'dli', convert: 'convert' }
const learnKeys: Record<Tool, string[]> = { nutrients: ['a', 'b', 'c', 'd'], vpd: ['a', 'b', 'c', 'd'], dli: ['a', 'b', 'c', 'd'], convert: ['a', 'b', 'c'] }

// ── VPD ───────────────────────────────────────────────────────────
const temp = useLocalStorage('budbuddy:vpd-temp', 25)
const rh = useLocalStorage('budbuddy:vpd-rh', 60)
const leafOffset = useLocalStorage('budbuddy:vpd-leaf', -2)
const vpdValue = computed(() => vpd(n(temp.value), Math.min(100, Math.max(0, n(rh.value))), n(leafOffset.value)))
const zone = computed(() => vpdZone(vpdValue.value))
const VPD_MAX = 2
const vpdBands = [
  { from: 0, to: 0.4, key: 'low', color: '#7cc8f2' },
  { from: 0.4, to: 0.8, key: 'clones', color: '#6fe0c8' },
  { from: 0.8, to: 1.2, key: 'veg', color: '#9be36b' },
  { from: 1.2, to: 1.6, key: 'flower', color: '#c9a2ff' },
  { from: 1.6, to: 2, key: 'high', color: '#ff5f6d' }
]
// zone.label is localized, so match on colour
const activeBand = computed(() => vpdBands.find(b => b.color === zone.value.color) ?? vpdBands[0]!)
const vpdPos = computed(() => Math.min(100, Math.max(0, (vpdValue.value / VPD_MAX) * 100)))

// ── DLI ───────────────────────────────────────────────────────────
const ppfd = useLocalStorage('budbuddy:dli-ppfd', 600)
const hours = useLocalStorage('budbuddy:dli-hours', 18)
const targetDli = useLocalStorage('budbuddy:dli-target', 40)
const dliValue = computed(() => dli(pos(ppfd.value), Math.min(24, pos(hours.value))))
// null when there is no light period to spread the target over
const neededPpfd = computed(() => (pos(hours.value) > 0 ? ppfdForDli(pos(targetDli.value), Math.min(24, pos(hours.value))) : null))
const lightPresets = [
  { key: 'seedling', ppfd: 250, hours: 18 },
  { key: 'veg', ppfd: 550, hours: 18 },
  { key: 'flower', ppfd: 900, hours: 12 },
  { key: 'auto', ppfd: 650, hours: 20 }
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
      :title="t('tools.title')"
      :subtitle="t('tools.subtitle')"
    />
    <div class="page">
      <div
        class="segmented"
        role="tablist"
        :aria-label="t('tools.title')"
      >
        <button
          v-for="tb in tools"
          :key="tb.id"
          type="button"
          role="tab"
          :aria-selected="tool === tb.id"
          @click="tool = tb.id"
        >
          {{ tb.label }}
        </button>
      </div>

      <div class="tool">
        <!-- What is this for? -->
        <details
          :key="tool"
          class="card about"
          :open="aboutOpen"
          @toggle="onAboutToggle"
        >
          <summary class="about-summary">
            <UIcon
              name="i-tabler-bulb"
              class="about-icon size-4"
              aria-hidden="true"
            />
            <span>{{ t('tools.whatFor') }}</span>
          </summary>
          <div class="about-body">
            <p class="about-text">
              {{ t(`tools.${aboutNs[tool]}.what`) }}
            </p>
            <ul>
              <li
                v-for="k in learnKeys[tool]"
                :key="k"
              >
                {{ t(`tools.${aboutNs[tool]}.learn.${k}`) }}
              </li>
            </ul>
          </div>
        </details>

        <!-- Nutrients -->
        <section
          v-if="tool === 'nutrients'"
          class="tool rise"
        >
          <!-- 1 · water -->
          <div class="card pad step">
            <h2 class="step-title">
              <span
                class="step-no num"
                aria-hidden="true"
              >1</span>{{ t('tools.mix.step1') }}
            </h2>
            <p class="step-hint">
              {{ t('tools.mix.step1Hint') }}
            </p>
            <div class="water-row">
              <div class="unit water-input">
                <input
                  id="mix-l"
                  v-model.number="litres"
                  class="input num"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="any"
                  :aria-label="t('tools.mix.water') + t('tools.mix.waterSr')"
                >
                <span aria-hidden="true">L</span>
              </div>
              <button
                v-for="v in [5, 10, 20]"
                :key="v"
                type="button"
                class="chip num"
                :aria-pressed="litres === v"
                @click="litres = v"
              >
                {{ v }} {{ t('tools.convert.litre') }}
              </button>
            </div>
          </div>

          <!-- 2 · products -->
          <div class="card pad step">
            <h2 class="step-title">
              <span
                class="step-no num"
                aria-hidden="true"
              >2</span>{{ t('tools.mix.step2') }}
            </h2>
            <p class="step-hint">
              {{ t('tools.mix.step2Hint') }}
            </p>
            <div
              v-if="lines.length"
              class="line line-head"
              aria-hidden="true"
            >
              <span>{{ t('tools.mix.colProduct') }}</span>
              <span>{{ t('tools.mix.colDose') }}</span>
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
                  :placeholder="t('tools.mix.product')"
                  :aria-label="t('tools.mix.productName', { n: i + 1 })"
                >
                <div class="unit">
                  <input
                    v-model.number="l.dose"
                    class="input num"
                    type="number"
                    inputmode="decimal"
                    min="0"
                    step="0.1"
                    :aria-label="t('tools.mix.productDose', { n: i + 1 })"
                  >
                  <span aria-hidden="true">ml/L</span>
                </div>
                <button
                  type="button"
                  class="icon-btn danger"
                  :aria-label="t('tools.mix.removeProduct', { n: i + 1 })"
                  @click="removeLine(i)"
                >
                  <UIcon
                    name="i-tabler-x"
                    class="size-4"
                  />
                </button>
              </div>
            </div>
            <div class="step-actions">
              <button
                type="button"
                class="btn btn-soft"
                @click="addLine"
              >
                <UIcon
                  name="i-tabler-plus"
                  class="size-4"
                /> {{ t('tools.mix.addProduct') }}
              </button>
              <button
                v-if="!mix.length"
                type="button"
                class="btn btn-ghost"
                @click="useExample"
              >
                {{ t('tools.mix.useExample') }}
              </button>
            </div>
          </div>

          <!-- 3 · strength -->
          <div class="card pad step">
            <h2 class="step-title">
              <span
                class="step-no num"
                aria-hidden="true"
              >3</span>{{ t('tools.mix.step3') }}
            </h2>
            <p class="step-hint">
              {{ t('tools.mix.step3Hint') }}
            </p>
            <div class="levels">
              <button
                v-for="s in strengthLevels"
                :key="s"
                type="button"
                class="level"
                :aria-pressed="strength === s"
                @click="strength = s"
              >
                <strong class="num">{{ s }} %</strong>
                <span>{{ t(`tools.mix.levels.${s}`) }}</span>
              </button>
            </div>
            <div class="field custom-strength">
              <label
                class="field-label"
                for="mix-s"
              >{{ t('tools.mix.strength') }}<span class="sr-only">{{ t('tools.mix.strengthSr') }}</span></label>
              <div class="unit">
                <input
                  id="mix-s"
                  v-model.number="strength"
                  class="input num"
                  type="number"
                  inputmode="numeric"
                  min="0"
                  max="200"
                  step="5"
                >
                <span aria-hidden="true">%</span>
              </div>
            </div>
          </div>

          <!-- Recipe -->
          <div
            class="card pad recipe"
            aria-live="polite"
          >
            <h2 class="recipe-title">
              <GrowIcon name="feed" /> {{ t('tools.mix.recipeTitle', { l: n(litres) }) }}
            </h2>
            <p
              v-if="!mix.length"
              class="muted empty-mix"
            >
              {{ t('tools.mix.empty') }}
            </p>
            <template v-else>
              <ul class="mix">
                <li
                  v-for="m in mix"
                  :key="m.name"
                >
                  <span class="mix-name">
                    {{ m.name }}
                    <small class="num">{{ t('tools.mix.perLitre', { d: formatNumber(m.dosePerLitre, 2) }) }}</small>
                  </span>
                  <strong class="num">{{ formatNumber(m.total) }}<small>ml</small></strong>
                </li>
                <li class="mix-total">
                  <span class="mix-name">{{ t('tools.mix.total') }}</span>
                  <strong class="num">{{ formatNumber(mixTotal) }}<small>ml</small></strong>
                </li>
              </ul>
              <div class="how">
                <h3>{{ t('tools.mix.howTitle') }}</h3>
                <ol>
                  <li
                    v-for="(k, i) in ['a', 'b', 'c']"
                    :key="k"
                  >
                    <span
                      class="how-no num"
                      aria-hidden="true"
                    >{{ i + 1 }}</span>
                    <span>{{ t(`tools.mix.how.${k}`) }}</span>
                  </li>
                </ol>
              </div>
            </template>
            <div
              v-if="growingPlants.length && mix.length"
              class="log-row"
            >
              <label
                class="field-label"
                for="mix-log-plant"
              >{{ t('tools.mix.logPlant') }}</label>
              <select
                id="mix-log-plant"
                v-model="logPlant"
                class="input"
              >
                <option
                  value=""
                  disabled
                >
                  {{ t('tools.mix.logPlaceholder') }}
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
                {{ t('tools.mix.log') }}
              </button>
            </div>
          </div>
        </section>

        <!-- VPD -->
        <section
          v-else-if="tool === 'vpd'"
          class="tool rise"
        >
          <div class="card pad form-stack">
            <h2 class="section-title">
              {{ t('tools.vpd.inputsTitle') }}
            </h2>
            <div class="field">
              <div class="range-head">
                <label
                  class="field-label"
                  for="vpd-t"
                >{{ t('tools.vpd.airTemp') }}</label>
                <output
                  class="range-value num"
                  for="vpd-t"
                >{{ formatNumber(n(temp)) }} °C</output>
              </div>
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
              <div class="range-head">
                <label
                  class="field-label"
                  for="vpd-rh"
                >{{ t('tools.vpd.rh') }}</label>
                <output
                  class="range-value num"
                  for="vpd-rh"
                >{{ rh }} %</output>
              </div>
              <input
                id="vpd-rh"
                v-model.number="rh"
                type="range"
                min="10"
                max="100"
                step="1"
                class="range"
              >
              <span class="field-hint">{{ t('tools.vpd.rhHint') }}</span>
            </div>
            <div class="field">
              <div class="range-head">
                <label
                  class="field-label"
                  for="vpd-leaf"
                >{{ t('tools.vpd.leafOffset') }}</label>
                <output
                  class="range-value num"
                  for="vpd-leaf"
                >{{ formatNumber(n(leafOffset)) }} °C</output>
              </div>
              <input
                id="vpd-leaf"
                v-model.number="leafOffset"
                type="range"
                min="-5"
                max="2"
                step="0.5"
                class="range"
              >
              <span class="field-hint">{{ t('tools.vpd.leafHint') }}</span>
            </div>
          </div>

          <div
            class="card pad vpd"
            :style="{ '--c': activeBand.color }"
          >
            <span class="readout-label">{{ t('tools.vpd.resultLabel') }}</span>
            <p
              class="zone"
              aria-live="polite"
            >
              <span
                class="zone-dot"
                aria-hidden="true"
              />
              {{ t(`tools.vpd.zones.${activeBand.key}.title`) }}
            </p>
            <p class="advice">
              {{ t(`tools.vpd.zones.${activeBand.key}.do`) }}
            </p>

            <div
              class="band"
              role="img"
              :aria-label="t('tools.vpd.aria', { value: formatNumber(vpdValue, 2), zone: zone.label })"
            >
              <div class="band-track">
                <span
                  v-for="b in vpdBands"
                  :key="b.from"
                  class="band-seg"
                  :class="{ on: b === activeBand }"
                  :style="{ '--seg': b.color }"
                />
              </div>
              <div
                class="band-glide"
                :style="{ transform: `translateX(${vpdPos}%)` }"
              >
                <i class="band-marker" />
              </div>
              <div class="band-labels">
                <span
                  v-for="b in vpdBands"
                  :key="b.from"
                  :class="{ on: b === activeBand }"
                >{{ t(`tools.vpd.bands.${b.key}`) }}</span>
              </div>
            </div>

            <p class="vpd-number">
              <strong class="mid-value num">{{ formatNumber(vpdValue, 2, true) }}<small>kPa</small></strong>
              <span>VPD · {{ zone.label }}</span>
            </p>
          </div>

          <div class="card pad">
            <h2 class="section-title block-title">
              {{ t('tools.vpd.targets') }}
            </h2>
            <table class="ref">
              <tbody>
                <tr>
                  <td>{{ t('tools.vpd.clones') }}</td><td class="num">
                    {{ formatNumber(0.4) }} – {{ formatNumber(0.8) }} kPa
                  </td>
                </tr>
                <tr>
                  <td>{{ t('tools.vpd.veg') }}</td><td class="num">
                    {{ formatNumber(0.8) }} – {{ formatNumber(1.2) }} kPa
                  </td>
                </tr>
                <tr>
                  <td>{{ t('tools.vpd.flower') }}</td><td class="num">
                    {{ formatNumber(1.2) }} – {{ formatNumber(1.6) }} kPa
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- DLI -->
        <section
          v-else-if="tool === 'dli'"
          class="tool rise"
        >
          <div class="card pad form-stack">
            <h2 class="section-title">
              {{ t('tools.dli.presetsTitle') }}
            </h2>
            <div class="chips">
              <button
                v-for="p in lightPresets"
                :key="p.key"
                type="button"
                class="chip"
                :aria-pressed="ppfd === p.ppfd && hours === p.hours"
                @click="ppfd = p.ppfd; hours = p.hours"
              >
                {{ t(`tools.dli.presets.${p.key}`) }} <span class="num chip-meta">{{ p.ppfd }} · {{ p.hours }}h</span>
              </button>
            </div>
            <div class="form-grid">
              <div class="field">
                <label
                  class="field-label"
                  for="dli-p"
                >{{ t('tools.dli.ppfd') }}<span class="sr-only">{{ t('tools.dli.ppfdSr') }}</span></label>
                <div class="unit">
                  <input
                    id="dli-p"
                    v-model.number="ppfd"
                    class="input num"
                    type="number"
                    inputmode="numeric"
                    min="0"
                    step="10"
                  >
                  <span aria-hidden="true">µmol</span>
                </div>
                <span class="field-hint">{{ t('tools.dli.ppfdHint') }}</span>
              </div>
              <div class="field">
                <label
                  class="field-label"
                  for="dli-h"
                >{{ t('tools.dli.hours') }}</label>
                <div class="unit">
                  <input
                    id="dli-h"
                    v-model.number="hours"
                    class="input num"
                    type="number"
                    inputmode="decimal"
                    min="0"
                    max="24"
                    step="1"
                  >
                  <span aria-hidden="true">h</span>
                </div>
                <span class="field-hint">{{ t('tools.dli.hoursHint') }}</span>
              </div>
            </div>
          </div>
          <div
            class="card pad dli"
            aria-live="polite"
          >
            <div class="readout">
              <span class="readout-label">{{ t('tools.dli.label') }}</span>
              <strong class="big-value lamp num">{{ formatNumber(dliValue, 1) }}<small>{{ t('tools.dli.unit') }}</small></strong>
            </div>
            <p class="advice">
              {{ dliAdvice(dliValue) }}
            </p>
          </div>
          <div class="card pad form-stack">
            <h2 class="section-title">
              {{ t('tools.dli.reverseTitle') }}
            </h2>
            <div class="field">
              <div class="range-head">
                <label
                  class="field-label"
                  for="dli-t"
                >{{ t('tools.dli.target') }}</label>
                <output
                  class="range-value num"
                  for="dli-t"
                >{{ formatNumber(n(targetDli)) }} mol</output>
              </div>
              <input
                id="dli-t"
                v-model.number="targetDli"
                type="range"
                min="5"
                max="65"
                step="1"
                class="range lamp"
              >
            </div>
            <div class="reverse">
              <strong class="num">{{ neededPpfd == null ? '–' : formatNumber(neededPpfd, 0) }}<small>µmol/m²/s</small></strong>
              <span>{{ t('tools.dli.needed', { h: hours }) }}</span>
            </div>
          </div>
        </section>

        <!-- Convert -->
        <section
          v-else
          class="tool rise"
        >
          <div class="card pad form-stack">
            <h2 class="section-title">
              {{ t('tools.convert.volume') }}
            </h2>
            <div class="convert">
              <div class="field">
                <label
                  class="field-label"
                  for="c-gal"
                >{{ t('tools.convert.gallons') }}</label>
                <div class="unit">
                  <input
                    id="c-gal"
                    v-model.number="gal"
                    class="input num"
                    type="number"
                    inputmode="decimal"
                    min="0"
                    step="any"
                    @input="fromGal"
                  >
                  <span aria-hidden="true">gal</span>
                </div>
              </div>
              <UIcon
                name="i-tabler-arrows-exchange"
                class="size-5 swap"
              />
              <div class="field">
                <label
                  class="field-label"
                  for="c-l"
                >{{ t('tools.convert.litres') }}</label>
                <div class="unit">
                  <input
                    id="c-l"
                    v-model.number="lit"
                    class="input num"
                    type="number"
                    inputmode="decimal"
                    min="0"
                    step="any"
                    @input="fromLit"
                  >
                  <span aria-hidden="true">L</span>
                </div>
              </div>
            </div>
          </div>
          <div class="card pad form-stack">
            <h2 class="section-title">
              {{ t('tools.convert.temperature') }}
            </h2>
            <div class="convert">
              <div class="field">
                <label
                  class="field-label"
                  for="c-f"
                >{{ t('tools.convert.fahrenheit') }}</label>
                <div class="unit">
                  <input
                    id="c-f"
                    v-model.number="fahr"
                    class="input num"
                    type="number"
                    inputmode="decimal"
                    step="any"
                    @input="fromF"
                  >
                  <span aria-hidden="true">°F</span>
                </div>
              </div>
              <UIcon
                name="i-tabler-arrows-exchange"
                class="size-5 swap"
              />
              <div class="field">
                <label
                  class="field-label"
                  for="c-c"
                >{{ t('tools.convert.celsius') }}</label>
                <div class="unit">
                  <input
                    id="c-c"
                    v-model.number="cels"
                    class="input num"
                    type="number"
                    inputmode="decimal"
                    step="any"
                    @input="fromC"
                  >
                  <span aria-hidden="true">°C</span>
                </div>
              </div>
            </div>
          </div>
          <div class="card pad">
            <h2 class="section-title block-title">
              {{ t('tools.convert.potSizes') }}
            </h2>
            <table class="ref">
              <tbody>
                <tr
                  v-for="g in [1, 2, 3, 5, 7, 10]"
                  :key="g"
                >
                  <td class="num">
                    {{ formatNumber(g) }} gal
                  </td><td class="num">
                    {{ formatNumber(gallonsToLitres(g), 1) }} {{ t('tools.convert.litre') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
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
  min-height: 44px;
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
  padding: 18px 16px;
}

.block-title {
  margin-bottom: 14px;
}

/* Beginner framing: one line, opens to the explainer */
.about {
  padding: 0 16px;
}

.about-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-2);
  cursor: pointer;
  list-style: none;
}

.about-summary::-webkit-details-marker {
  display: none;
}

.about-summary::after {
  content: '';
  width: 7px;
  height: 7px;
  margin: -3px 4px 0 auto;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(45deg);
  transition: transform var(--dur) var(--ease-out);
}

.about[open] .about-summary::after {
  margin-top: 3px;
  transform: rotate(-135deg);
}

.about-summary:focus-visible {
  outline: 2px solid var(--leaf);
  outline-offset: -2px;
  border-radius: 10px;
}

.about-icon {
  flex-shrink: 0;
  color: var(--text-3);
}

.about-body {
  padding: 0 0 16px;
}

.about-text {
  margin: 0 0 10px;
  font-size: 15px;
  line-height: 1.5;
  color: var(--text);
}

.about-body ul {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
}

/* Guided steps */
.step-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
}

.step-no {
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px var(--accent-line);
  color: var(--leaf);
  font-size: 14px;
  font-weight: 600;
}

.step-hint {
  margin: 6px 0 14px 38px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-2);
}

.chip {
  min-height: 44px;
}

.water-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.water-input {
  flex: 1 1 120px;
  min-width: 110px;
}

.water-input .input {
  font-size: 22px;
}

.line-head {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-3);
}

.step-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.levels {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.level {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 60px;
  padding: 6px 4px;
  border-radius: 14px;
  border: 1px solid var(--line-strong);
  background: var(--surface);
  color: var(--text-2);
  text-align: center;
  transition: background var(--dur) var(--ease-out), border-color var(--dur) var(--ease-out), color var(--dur) ease;
}

.level strong {
  font-size: 17px;
  font-weight: 500;
  color: var(--text);
}

.level span {
  font-size: 11px;
  font-weight: 500;
  line-height: 1.25;
}

.level[aria-pressed="true"] {
  background: var(--accent-soft);
  border-color: var(--accent-line);
  color: var(--leaf);
}

.level[aria-pressed="true"] strong {
  color: var(--leaf);
}

.custom-strength {
  margin-top: 14px;
  max-width: 200px;
}

/* Recipe card */
.recipe {
  border-color: var(--accent-line);
  background: linear-gradient(180deg, var(--accent-soft), transparent 55%), var(--panel);
}

.recipe-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.mix-total .mix-name {
  color: var(--text-2);
}

.mix-total strong {
  color: var(--text-2);
}

.how h3 {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.how ol {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
}

.how li {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

/* small version of .step-no */
.how-no {
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent-soft);
  box-shadow: inset 0 0 0 1px var(--accent-line);
  color: var(--leaf);
  font-size: 12px;
  font-weight: 600;
}

/* VPD numeric detail */
.vpd-number {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 18px 0 0;
  padding-top: 14px;
  border-top: 1px solid var(--line);
  font-size: 13px;
  color: var(--text-3);
}

.mid-value {
  font-size: 28px;
  font-weight: 300;
  letter-spacing: -0.02em;
  color: var(--text);
}

.mid-value small {
  margin-left: 4px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-3);
}

/* Inputs with a unit suffix */
.unit {
  position: relative;
}

.unit .input {
  padding-right: 52px;
}

.unit span {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-3);
  pointer-events: none;
}

.lines {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.line {
  display: grid;
  grid-template-columns: 1fr 118px 44px;
  gap: 8px;
  align-items: center;
}

/* Big light readouts */
.readout {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.big-value {
  font-size: 52px;
  font-weight: 300;
  line-height: 1;
  letter-spacing: -0.035em;
  color: var(--text);
}

.big-value small,
.mix strong small,
.reverse strong small {
  margin-left: 6px;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--text-3);
}

.big-value.lamp {
  color: var(--lamp);
  text-shadow: 0 0 28px rgba(255, 210, 138, 0.3);
}

.readout-label {
  font-size: 13px;
  color: var(--text-2);
}

.empty-mix {
  margin: 0 0 12px;
}

.mix {
  list-style: none;
  margin: 14px 0 16px;
  padding: 0;
}

.mix li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid var(--line);
}

.mix-name {
  font-size: 14px;
  font-weight: 500;
  min-width: 0;
  overflow-wrap: anywhere;
}

.mix-name small {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-3);
}

.mix strong {
  flex-shrink: 0;
  font-size: 34px;
  line-height: 1;
  color: var(--leaf);
  font-weight: 300;
  letter-spacing: -0.02em;
}

.log-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.log-row .btn {
  width: 100%;
}

/* Sliders */
.range-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.range-value {
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
}

.range {
  --fill: var(--leaf);
  width: 100%;
  height: 32px;
  margin: 0;
  background: transparent;
  appearance: none;
  -webkit-appearance: none;
}

.range.lamp {
  --fill: var(--lamp);
}

.range::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background: #0b0d10;
  box-shadow: inset 0 0 0 1px var(--line-strong);
}

.range::-moz-range-track {
  height: 4px;
  border-radius: 999px;
  background: #0b0d10;
  box-shadow: inset 0 0 0 1px var(--line-strong);
}

.range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 24px;
  height: 24px;
  margin-top: -10px;
  border-radius: 50%;
  background: var(--fill);
  border: 3px solid #0b0d10;
  box-shadow: 0 0 0 1px var(--fill), 0 0 12px color-mix(in srgb, var(--fill) 50%, transparent);
  transition: transform var(--dur-fast) var(--ease-out);
}

.range::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--fill);
  border: 3px solid #0b0d10;
  box-shadow: 0 0 0 1px var(--fill), 0 0 12px color-mix(in srgb, var(--fill) 50%, transparent);
}

.range:active::-webkit-slider-thumb {
  transform: scale(1.12);
}

/* VPD zone band */
.zone {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 6px 0 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--text);
}

.zone-dot {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--c);
  box-shadow: 0 0 10px var(--c);
  transition: background var(--dur) ease, box-shadow var(--dur) ease;
}

.band {
  position: relative;
  margin-top: 26px;
}

.band-track {
  display: flex;
  gap: 2px;
  height: 8px;
}

.band-seg {
  flex: 1;
  border-radius: 4px;
  background: var(--seg);
  opacity: 0.28;
  transition: opacity var(--dur) ease, box-shadow var(--dur) ease;
}

.band-seg.on {
  opacity: 1;
  box-shadow: 0 0 14px color-mix(in srgb, var(--seg) 55%, transparent);
}

.band-glide {
  position: absolute;
  top: -8px;
  left: 0;
  width: 100%;
  height: 24px;
  pointer-events: none;
  transition: transform var(--dur-slow) var(--ease-out);
}

.band-marker {
  position: absolute;
  left: -2px;
  top: 0;
  width: 4px;
  height: 24px;
  border-radius: 2px;
  background: #fff;
  box-shadow: 0 0 0 2px var(--surface-2), 0 0 12px rgba(255, 255, 255, 0.5);
}

.band-labels {
  display: flex;
  gap: 2px;
  margin-top: 10px;
}

.band-labels span {
  flex: 1;
  text-align: center;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-3);
  white-space: nowrap;
  transition: color var(--dur) ease;
}

.band-labels span.on {
  color: var(--text);
  font-weight: 600;
}

.band-ticks {
  position: relative;
  height: 14px;
  margin-top: 4px;
}

.band-ticks span {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  font-size: 11px;
  color: var(--text-3);
}

.advice {
  margin: 14px 0 0;
  font-size: 14px;
  color: var(--text-2);
  line-height: 1.5;
}

/* DLI */
.reverse {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reverse strong {
  font-size: 34px;
  font-weight: 300;
  line-height: 1;
  letter-spacing: -0.03em;
  color: var(--lamp);
}

.reverse > span {
  font-size: 13px;
  color: var(--text-2);
}

.chip-meta {
  font-weight: 500;
  color: var(--text-3);
}

.chip[aria-pressed="true"] .chip-meta {
  color: inherit;
}

/* Reference tables */
.ref {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.ref td {
  padding: 11px 0;
  border-top: 1px solid var(--line);
}

.ref tr:first-child td {
  border-top: 0;
}

.ref td:last-child {
  text-align: right;
  font-weight: 500;
}

/* Converters */
.convert {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  gap: 10px;
}

.swap {
  margin-bottom: 14px;
  color: var(--text-3);
}

@media (prefers-reduced-motion: reduce) {
  .band-glide,
  .about-summary::after {
    transition: none;
  }
}
</style>
