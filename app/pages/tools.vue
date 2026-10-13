<script setup lang="ts">
import type { NutrientLine } from '~/utils/calc'
import { feedLinesText, matchStock } from '~/utils/feeding'
import { isIssueId } from '~/utils/treatment'

const { t } = useI18n()

const { state } = useGrow()
const inventory = useInventory()

type Tool = 'nutrients' | 'vpd' | 'dli' | 'convert' | 'curing' | 'treatment'
const TOOL_IDS: Tool[] = ['nutrients', 'vpd', 'dli', 'convert', 'curing', 'treatment']
const TOOL_META: Record<Tool, { icon: string, tone: string }> = {
  nutrients: { icon: 'feed', tone: 'var(--green)' },
  vpd: { icon: 'i-tabler-wind', tone: 'var(--blue)' },
  dli: { icon: 'lamp', tone: 'var(--amber)' },
  convert: { icon: 'i-tabler-arrows-exchange', tone: 'var(--text-2)' },
  curing: { icon: 'curing', tone: 'var(--amber)' },
  treatment: { icon: 'pest', tone: '#f0905a' }
}
const tools = computed(() => TOOL_IDS.map(id => ({ id, ...TOOL_META[id], label: t(`tools.tabs.${id}`), desc: t(`tools.desc.${id}`) })))
const route = useRoute()
// the open tool lives in the URL so guide links and back navigation keep working
const tool = computed<Tool | null>(() => {
  const q = route.query.t as Tool
  return TOOL_IDS.includes(q) ? q : null
})
const toolLabel = computed(() => (tool.value ? t(`tools.tabs.${tool.value}`) : t('tools.title')))
useHead({ title: () => (tool.value ? `${toolLabel.value} · ${t('tools.title')}` : t('tools.title')) })

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
const pos = (v: unknown) => Math.max(0, n(v))

// The explainer starts open only on the first visit to each tool, so the calculator stays above the fold.
const seenTools = useLocalStorage<string[]>('budbuddy:tools-seen', [])
const aboutOpen = ref(false)
watch(tool, (v) => {
  if (!v) return
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
const prefill = computed(() => {
  const feedLines = mix.value.map(m => ({ name: m.name, dose: m.dosePerLitre, stockId: matchStock(m.name, inventory.inv.value.nutrients)?.id ?? null }))
  return { nutrients: feedLinesText(feedLines), feedLines }
})

function logMix() {
  if (!logPlant.value && growingPlants.value[0]) logPlant.value = growingPlants.value[0].id
  if (logPlant.value) logOpen.value = true
}

// "What is this for?" + "Learn more" per tool
const aboutNs: Record<Tool, string> = { nutrients: 'mix', vpd: 'vpd', dli: 'dli', convert: 'convert', curing: 'curing', treatment: 'treatment' }
const learnKeys: Record<Tool, string[]> = { nutrients: ['a', 'b', 'c', 'd'], vpd: ['a', 'b', 'c', 'd'], dli: ['a', 'b', 'c', 'd'], convert: ['a', 'b', 'c'], curing: ['a', 'b', 'c'], treatment: ['a', 'b', 'c'] }

// ── VPD ───────────────────────────────────────────────────────────
const temp = useLocalStorage('budbuddy:vpd-temp', 25)
const rh = useLocalStorage('budbuddy:vpd-rh', 60)
const leafOffset = useLocalStorage('budbuddy:vpd-leaf', -2)
const vpdValue = computed(() => vpd(n(temp.value), Math.min(100, Math.max(0, n(rh.value))), n(leafOffset.value)))
const zone = computed(() => vpdZone(vpdValue.value))
const VPD_MAX = 2
// band colours come from vpdZone so the readout and the band always agree
const vpdBands = [
  { from: 0, to: 0.4, key: 'low' },
  { from: 0.4, to: 0.8, key: 'clones' },
  { from: 0.8, to: 1.2, key: 'veg' },
  { from: 1.2, to: 1.6, key: 'flower' },
  { from: 1.6, to: 2, key: 'high' }
].map(b => ({ ...b, color: vpdZone((b.from + b.to) / 2).color }))
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
      :title="toolLabel"
      :subtitle="tool ? t('tools.title') : t('tools.subtitle')"
      :back="!!tool"
    />

    <!-- Tool list -->
    <div
      v-if="!tool"
      class="page rise"
    >
      <nav
        class="card tool-list"
        :aria-label="t('tools.title')"
      >
        <NuxtLink
          v-for="tb in tools"
          :key="tb.id"
          :to="{ path: '/tools', query: { t: tb.id } }"
          class="tool-row"
        >
          <span
            class="tool-tile"
            :style="{ color: tb.tone }"
          >
            <GrowIcon :name="tb.icon" />
          </span>
          <span class="tool-text">
            <span class="tool-title">{{ tb.label }}</span>
            <span class="tool-desc">{{ tb.desc }}</span>
          </span>
          <UIcon
            name="i-tabler-chevron-right"
            class="size-5 tool-go"
          />
        </NuxtLink>
      </nav>
      <KitManageLinks />

      <ReviewToolLinks />

      <NuxtLink
        to="/environment"
        class="card tool-row"
      >
        <span
          class="tool-tile"
          style="color: var(--blue)"
        >
          <UIcon name="i-tabler-temperature" />
        </span>
        <span class="tool-text">
          <span class="tool-title">{{ t('environment.open') }}</span>
          <span class="tool-desc">{{ t('environment.openDesc') }}</span>
        </span>
        <UIcon
          name="i-tabler-chevron-right"
          class="size-5 tool-go"
        />
      </NuxtLink>
    </div>

    <div
      v-else
      :key="tool"
      class="page rise"
    >
      <!-- What is this for? -->
      <details
        class="about"
        :open="aboutOpen"
        @toggle="onAboutToggle"
      >
        <summary class="about-summary">
          <span>{{ t('tools.whatFor') }}</span>
          <UIcon
            name="i-tabler-chevron-down"
            class="size-4 about-chevron"
          />
        </summary>
        <div class="about-body">
          <p>{{ t(`tools.${aboutNs[tool]}.what`) }}</p>
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
      <template v-if="tool === 'nutrients'">
        <section>
          <div class="section-head">
            <h2 class="section-title">
              {{ t('tools.mix.step1') }}
            </h2>
          </div>
          <div class="card pad form-stack">
            <div class="field">
              <label
                class="field-label"
                for="mix-l"
              >{{ t('tools.mix.water') }}<span class="sr-only">{{ t('tools.mix.waterSr') }}</span></label>
              <div class="unit">
                <input
                  id="mix-l"
                  v-model.number="litres"
                  class="input num"
                  type="number"
                  inputmode="decimal"
                  min="0"
                  step="any"
                >
                <span aria-hidden="true">L</span>
              </div>
              <span class="field-hint">{{ t('tools.mix.step1Hint') }}</span>
            </div>
            <div
              class="chips"
              role="group"
              :aria-label="t('tools.mix.water')"
            >
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
        </section>

        <section>
          <div class="section-head">
            <h2 class="section-title">
              {{ t('tools.mix.step2') }}
            </h2>
          </div>
          <div class="card pad form-stack">
            <p class="field-hint">
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
            <div class="actions">
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
        </section>

        <section>
          <div class="section-head">
            <h2 class="section-title">
              {{ t('tools.mix.step3') }}
            </h2>
          </div>
          <div class="card pad form-stack">
            <div
              class="segmented levels"
              role="group"
              :aria-label="t('tools.mix.step3')"
            >
              <button
                v-for="s in strengthLevels"
                :key="s"
                type="button"
                :aria-pressed="strength === s"
                @click="strength = s"
              >
                <strong class="num">{{ s }} %</strong>
                <span>{{ t(`tools.mix.levels.${s}`) }}</span>
              </button>
            </div>
            <p class="field-hint">
              {{ t('tools.mix.step3Hint') }}
            </p>
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
        </section>

        <!-- Recipe -->
        <section aria-live="polite">
          <div class="section-head">
            <h2 class="section-title">
              <GrowIcon
                name="feed"
                class="title-icon"
              /> {{ t('tools.mix.recipeTitle', { l: n(litres) }) }}
            </h2>
          </div>
          <div class="card recipe">
            <p
              v-if="!mix.length"
              class="empty-mix"
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
                    v-for="k in ['a', 'b', 'c']"
                    :key="k"
                  >
                    {{ t(`tools.mix.how.${k}`) }}
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
                class="btn btn-primary btn-block"
                @click="logMix"
              >
                {{ t('tools.mix.log') }}
              </button>
            </div>
          </div>
        </section>
      </template>

      <!-- VPD -->
      <template v-else-if="tool === 'vpd'">
        <section>
          <div class="section-head">
            <h2 class="section-title">
              {{ t('tools.vpd.inputsTitle') }}
            </h2>
          </div>
          <div class="card pad form-stack">
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
        </section>

        <div
          class="card pad result"
          aria-live="polite"
        >
          <span class="result-label">{{ t('tools.vpd.resultLabel') }}</span>
          <strong class="result-value num">{{ formatNumber(vpdValue, 2, true) }}<small>kPa</small></strong>
          <p class="zone">
            <span
              class="zone-dot"
              :style="{ background: activeBand.color }"
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
                :style="{ background: b.color }"
              />
              <span
                class="band-marker"
                :style="{ left: `${vpdPos}%` }"
              />
            </div>
            <div class="band-labels">
              <span
                v-for="b in vpdBands"
                :key="b.from"
                :class="{ on: b === activeBand }"
              >{{ t(`tools.vpd.bands.${b.key}`) }}</span>
            </div>
          </div>
        </div>

        <section>
          <div class="section-head">
            <h2 class="section-title">
              {{ t('tools.vpd.targets') }}
            </h2>
          </div>
          <div class="card">
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
      </template>

      <!-- DLI -->
      <template v-else-if="tool === 'dli'">
        <section>
          <div class="section-head">
            <h2 class="section-title">
              {{ t('tools.dli.presetsTitle') }}
            </h2>
          </div>
          <div class="card pad form-stack">
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
        </section>

        <div
          class="card pad result"
          aria-live="polite"
        >
          <span class="result-label">{{ t('tools.dli.label') }}</span>
          <strong class="result-value num">{{ formatNumber(dliValue, 1) }}<small>{{ t('tools.dli.unit') }}</small></strong>
          <p class="advice">
            {{ dliAdvice(dliValue) }}
          </p>
        </div>

        <section>
          <div class="section-head">
            <h2 class="section-title">
              {{ t('tools.dli.reverseTitle') }}
            </h2>
          </div>
          <div class="card pad form-stack">
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
                class="range"
              >
            </div>
            <div class="reverse">
              <strong class="result-value num">{{ neededPpfd == null ? '–' : formatNumber(neededPpfd, 0) }}<small>µmol/m²/s</small></strong>
              <span class="result-label">{{ t('tools.dli.needed', { h: hours }) }}</span>
            </div>
          </div>
        </section>
      </template>

      <!-- Convert -->
      <template v-else-if="tool === 'convert'">
        <section>
          <div class="section-head">
            <h2 class="section-title">
              {{ t('tools.convert.volume') }}
            </h2>
          </div>
          <div class="card pad">
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
        </section>

        <section>
          <div class="section-head">
            <h2 class="section-title">
              {{ t('tools.convert.temperature') }}
            </h2>
          </div>
          <div class="card pad">
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
        </section>

        <section>
          <div class="section-head">
            <h2 class="section-title">
              {{ t('tools.convert.potSizes') }}
            </h2>
          </div>
          <div class="card">
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
      </template>

      <CareCuringTool v-else-if="tool === 'curing'" />
      <CareTreatmentList
        v-else-if="tool === 'treatment'"
        :start-issue="isIssueId(route.query.issue) ? route.query.issue : null"
      />
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
.pad {
  padding: 16px;
}

/* Tool list */
.tool-list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tool-row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 64px;
  padding: 10px 12px 10px 14px;
  color: inherit;
  text-decoration: none;
  transition: background var(--dur-fast) ease;
}

.tool-row + .tool-row {
  border-top: 1px solid var(--line);
}

.tool-row:active {
  background: var(--surface-2);
}

.tool-tile {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, currentColor 14%, transparent);
  font-size: 22px;
}

.tool-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tool-title {
  font-size: 15px;
  font-weight: 600;
}

.tool-desc {
  font-size: 13px;
  color: var(--text-2);
}

.tool-go {
  flex-shrink: 0;
  color: var(--text-3);
}

/* Explainer */
.about {
  margin: -8px 0;
}

.about-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 44px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-2);
  cursor: pointer;
  list-style: none;
}

.about-summary::-webkit-details-marker {
  display: none;
}

.about-summary:focus-visible {
  outline: 2px solid var(--green);
  outline-offset: -2px;
  border-radius: var(--radius-sm);
}

.about-chevron {
  flex-shrink: 0;
  color: var(--text-3);
  transition: transform var(--dur) var(--ease-out);
}

.about[open] .about-chevron {
  transform: rotate(180deg);
}

.about-body {
  padding: 0 0 8px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
}

.about-body p {
  margin: 0 0 8px;
}

.about-body ul {
  margin: 0;
  padding-left: 18px;
  list-style: disc;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title-icon {
  color: var(--green);
}

.chip {
  min-height: 44px;
}

.line-head {
  margin-bottom: -8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* Strength: segmented with a two-line label */
.levels button {
  flex-direction: column;
  gap: 1px;
  min-height: 52px;
  padding: 4px 2px;
}

.levels strong {
  font-size: 14px;
  font-weight: 600;
}

.levels span {
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
}

.levels button[aria-pressed="true"] strong {
  color: var(--green);
}

.custom-strength {
  max-width: 180px;
}

/* Recipe */
.recipe {
  padding: 4px 16px 16px;
}

.empty-mix {
  margin: 10px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
}

.mix {
  list-style: none;
  margin: 0;
  padding: 0;
}

.mix li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 56px;
  padding: 8px 0;
}

.mix li + li {
  border-top: 1px solid var(--line);
}

.mix-name {
  font-size: 15px;
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
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.mix strong small,
.result-value small {
  margin-left: 4px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0;
  color: var(--text-3);
}

.mix-total .mix-name,
.mix-total strong {
  color: var(--text-2);
}

.how {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.how h3 {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-2);
}

.how ol {
  margin: 0;
  padding-left: 18px;
  list-style: decimal;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
}

.log-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
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

/* Result card */
.result {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.result-label {
  font-size: 13px;
  color: var(--text-2);
}

.result-value {
  font-size: 28px;
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.01em;
}

.advice {
  margin: 4px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
}

/* Sliders */
.range-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.range-value {
  font-size: 15px;
  font-weight: 600;
}

.range {
  width: 100%;
  height: 32px;
  margin: 0;
  background: transparent;
  appearance: none;
  -webkit-appearance: none;
}

.range::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 999px;
  background: var(--track);
}

.range::-moz-range-track {
  height: 4px;
  border-radius: 999px;
  background: var(--track);
}

.range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 24px;
  height: 24px;
  margin-top: -10px;
  border-radius: 50%;
  background: var(--green);
  border: 0;
  transition: transform var(--dur-fast) var(--ease-out);
}

.range::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--green);
  border: 0;
}

.range:active::-webkit-slider-thumb {
  transform: scale(1.1);
}

/* VPD zone band */
.zone {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 0;
  font-size: 16px;
  font-weight: 600;
}

.zone-dot {
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.band {
  margin-top: 16px;
}

.band-track {
  position: relative;
  display: flex;
  gap: 2px;
  height: 8px;
}

.band-seg {
  flex: 1;
  border-radius: 4px;
  opacity: 0.3;
  transition: opacity var(--dur) ease;
}

.band-seg.on {
  opacity: 1;
}

.band-marker {
  position: absolute;
  top: -4px;
  width: 4px;
  height: 16px;
  margin-left: -2px;
  border-radius: 2px;
  background: var(--text);
  transition: left var(--dur-slow) var(--ease-out);
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
}

.band-labels span.on {
  color: var(--text);
  font-weight: 600;
}

/* DLI reverse */
.reverse {
  display: flex;
  flex-direction: column;
  gap: 4px;
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
  height: 48px;
  padding: 0 16px;
  border-top: 1px solid var(--line);
}

.ref tr:first-child td {
  border-top: 0;
}

.ref td:last-child {
  text-align: right;
  font-weight: 600;
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
  .band-marker,
  .about-chevron {
    transition: none;
  }
}
</style>
