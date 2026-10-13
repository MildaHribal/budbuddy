<script setup lang="ts">
import type { Location, Medium } from '~/types/grow'
import type { NutrientStock, SeedStock, SupplyStock } from '~/types/kit'
import { nutrientLow, seedLow, supplyLow } from '~/utils/inventory'

const { t } = useI18n()
useHead({ title: () => t('manage.inventory.title') })
const route = useRoute()
const router = useRouter()
const grow = useGrow()
const inventory = useInventory()
const costs = useCosts()
const { notify } = useNotify()
const { confirm } = useConfirm()

type Tab = 'seeds' | 'nutrients' | 'supplies'
const TABS: Tab[] = ['seeds', 'nutrients', 'supplies']
const tab = computed<Tab>({
  get: () => (TABS.includes(route.query.tab as Tab) ? route.query.tab as Tab : 'seeds'),
  set: v => router.replace({ query: { tab: v === 'seeds' ? undefined : v } })
})
const inv = inventory.inv
const cur = computed(() => costs.costs.value.currency)

// ── seeds ─────────────────────────────────────────────────────────
const seedOpen = ref(false)
const seed = reactive({ id: '', strain: '', breeder: '', count: 5 as number | '', type: 'photoperiod' as SeedStock['type'], sex: 'feminized' as SeedStock['sex'], purchaseDate: todayISO() as string | null, note: '', price: '' as number | '' })
const seedSubmitted = ref(false)
function openSeed(s?: SeedStock) {
  seedSubmitted.value = false
  Object.assign(seed, s ? { ...s, price: '' } : { id: '', strain: '', breeder: '', count: 5, type: 'photoperiod', sex: 'feminized', purchaseDate: todayISO(), note: '', price: '' })
  seedOpen.value = true
}
function saveSeed() {
  seedSubmitted.value = true
  if (!seed.strain.trim() || !(Number(seed.count) >= 0) || seed.count === '') return
  const saved = inventory.save('seeds', { ...seed, id: seed.id || undefined, count: Number(seed.count), purchaseDate: seed.purchaseDate || null })
  logExpense('seeds', `${saved.strain}${saved.breeder ? ` (${saved.breeder})` : ''}`, seed.price, seed.purchaseDate)
  seedOpen.value = false
}

// ── nutrients ─────────────────────────────────────────────────────
const nutOpen = ref(false)
const nut = reactive({ id: '', name: '', volumeMl: 1000 as number | '', leftMl: 1000 as number | '', price: '' as number | '' })
const nutSubmitted = ref(false)
function openNut(n?: NutrientStock) {
  nutSubmitted.value = false
  Object.assign(nut, n ? { id: n.id, name: n.name, volumeMl: n.volumeMl, leftMl: inventory.left(n), price: '' } : { id: '', name: '', volumeMl: 1000, leftMl: 1000, price: '' })
  nutOpen.value = true
}
const nutValid = computed(() => !!nut.name.trim() && Number(nut.volumeMl) > 0 && nut.leftMl !== '' && Number(nut.leftMl) >= 0)
function saveNut() {
  nutSubmitted.value = true
  if (!nutValid.value) return
  const volumeMl = Number(nut.volumeMl)
  const left = Math.min(volumeMl, Number(nut.leftMl))
  const existing = nut.id ? inv.value.nutrients.find(n => n.id === nut.id) : undefined
  const saved = inventory.save('nutrients', { id: nut.id || undefined, name: nut.name, volumeMl, ...(existing ? {} : { startMl: left, countedAt: new Date().toISOString() }) })
  // a changed amount is a recount
  if (existing && Math.abs(inventory.left(existing) - left) >= 0.5) inventory.recount(saved.id, left)
  logExpense('nutrients', saved.name, nut.price, todayISO())
  nutOpen.value = false
}
function onVolume() {
  if (!nut.id && typeof nut.volumeMl === 'number') nut.leftMl = nut.volumeMl
}

// ── supplies ──────────────────────────────────────────────────────
const supOpen = ref(false)
const sup = reactive({ id: '', kind: 'substrate' as SupplyStock['kind'], name: '', quantity: 50 as number | '', unit: 'L' as SupplyStock['unit'], lowAt: '' as number | '', price: '' as number | '' })
const supSubmitted = ref(false)
function openSup(s?: SupplyStock) {
  supSubmitted.value = false
  Object.assign(sup, s ? { ...s, lowAt: s.lowAt ?? '', price: '' } : { id: '', kind: 'substrate', name: '', quantity: 50, unit: 'L', lowAt: '', price: '' })
  supOpen.value = true
}
function onSupKind(k: SupplyStock['kind']) {
  sup.kind = k
  if (!sup.id) sup.unit = k === 'substrate' ? 'L' : 'pcs'
}
function saveSup() {
  supSubmitted.value = true
  if (!sup.name.trim() || sup.quantity === '' || Number(sup.quantity) < 0) return
  const saved = inventory.save('supplies', { ...sup, id: sup.id || undefined, quantity: Number(sup.quantity), lowAt: sup.lowAt === '' ? null : Number(sup.lowAt) })
  logExpense(sup.kind === 'substrate' ? 'substrate' : 'gear', saved.name, sup.price, todayISO())
  supOpen.value = false
}
function bump(s: SupplyStock, by: number) {
  inventory.save('supplies', { id: s.id, quantity: Math.max(0, s.quantity + by) })
}

function logExpense(category: 'seeds' | 'nutrients' | 'substrate' | 'gear', title: string, price: number | '', date: string | null) {
  if (typeof price !== 'number' || price <= 0) return
  costs.addExpense({ category, title, amount: price, date: date || todayISO(), runId: null })
  notify(t('manage.inventory.expenseLogged'), { tone: 'info' })
}

async function removeItem(kind: Tab, id: string, name: string) {
  const ok = await confirm({ title: t('manage.inventory.deleteTitle', { name }), confirmLabel: t('common.delete'), danger: true })
  if (!ok) return
  inventory.remove(kind, id)
  seedOpen.value = nutOpen.value = supOpen.value = false
}

// ── plant from seed ───────────────────────────────────────────────
const plantOpen = ref(false)
const plantSeedRef = ref<SeedStock | null>(null)
const plantForm = reactive({ name: '', startDate: todayISO(), medium: 'soil' as Medium, location: 'indoor' as Location })
const MEDIA: Medium[] = ['soil', 'coco', 'hydro', 'other']
const LOCATIONS: Location[] = ['indoor', 'outdoor', 'greenhouse']
function openPlant(s: SeedStock) {
  plantSeedRef.value = s
  const n = grow.state.plants.filter(p => p.strain === s.strain).length + 1
  Object.assign(plantForm, { name: `${s.strain} #${n}`, startDate: todayISO(), medium: 'soil', location: 'indoor' })
  plantOpen.value = true
}
function plantIt() {
  const s = plantSeedRef.value
  if (!s || !plantForm.name.trim() || !isValidISODate(plantForm.startDate)) return
  const p = inventory.plantSeed(s.id, {
    name: plantForm.name.trim(),
    strain: s.strain,
    type: s.type,
    stage: 'germination',
    startDate: plantForm.startDate,
    medium: plantForm.medium,
    location: plantForm.location,
    notes: s.breeder ? t('manage.inventory.fromSeed', { breeder: s.breeder }) : ''
  })
  plantOpen.value = false
  if (p) {
    notify(t('manage.inventory.planted', { name: p.name }))
    navigateTo(`/plants/${p.id}`)
  }
}

const pct = (n: NutrientStock) => Math.max(0, Math.min(100, (inventory.left(n) / Math.max(1, n.volumeMl)) * 100))
const counts = computed(() => ({ seeds: inv.value.seeds.reduce((s, x) => s + x.count, 0), nutrients: inv.value.nutrients.length, supplies: inv.value.supplies.length }))
const unitLabel = (u: SupplyStock['unit']) => t(`manage.inventory.units.${u}`)
</script>

<template>
  <div>
    <AppHeader
      :title="t('manage.inventory.title')"
      :subtitle="t('manage.inventory.subtitle')"
      back
    />
    <div class="page">
      <div
        class="segmented"
        role="tablist"
        :aria-label="t('manage.inventory.title')"
      >
        <button
          v-for="tb in TABS"
          :key="tb"
          type="button"
          role="tab"
          :aria-selected="tab === tb"
          @click="tab = tb"
        >
          {{ t(`manage.inventory.tabs.${tb}`) }} <span class="num tab-count">{{ counts[tb] }}</span>
        </button>
      </div>

      <!-- Seeds -->
      <section
        v-if="tab === 'seeds'"
        class="rise list-wrap"
      >
        <EmptyState
          v-if="!inv.seeds.length"
          icon="germination"
          :title="t('manage.inventory.noSeedsTitle')"
          :text="t('manage.inventory.noSeedsText')"
        />
        <article
          v-for="s in inv.seeds"
          :key="s.id"
          class="card item"
        >
          <button
            type="button"
            class="item-main"
            @click="openSeed(s)"
          >
            <span class="item-text">
              <strong>{{ s.strain }}</strong>
              <span>{{ [s.breeder, t(`manage.inventory.types.${s.type}`), t(`manage.inventory.sex.${s.sex}`)].filter(Boolean).join(' · ') }}</span>
              <span
                v-if="s.purchaseDate"
                class="faint"
              >{{ t('manage.inventory.bought', { date: formatDate(s.purchaseDate) }) }}</span>
            </span>
            <span class="qty">
              <strong class="num">{{ s.count }}</strong>
              <span
                v-if="seedLow(s)"
                class="badge"
                :class="s.count === 0 ? 'badge-attention' : 'low'"
              >{{ s.count === 0 ? t('manage.inventory.out') : t('manage.inventory.lastSeed') }}</span>
              <span
                v-else
                class="unit-txt"
              >{{ t('manage.inventory.seedsUnit') }}</span>
            </span>
          </button>
          <button
            type="button"
            class="btn btn-soft compact"
            :disabled="s.count < 1"
            @click="openPlant(s)"
          >
            <GrowIcon
              name="germination"
              class="text-[18px]"
            /> {{ t('manage.inventory.plantSeed') }}
          </button>
        </article>
        <button
          type="button"
          class="btn btn-block"
          @click="openSeed()"
        >
          <UIcon
            name="i-tabler-plus"
            class="size-4"
          /> {{ t('manage.inventory.addSeeds') }}
        </button>
      </section>

      <!-- Nutrients -->
      <section
        v-else-if="tab === 'nutrients'"
        class="rise list-wrap"
      >
        <EmptyState
          v-if="!inv.nutrients.length"
          icon="feed"
          :title="t('manage.inventory.noNutrientsTitle')"
          :text="t('manage.inventory.noNutrientsText')"
        />
        <div
          v-else
          class="card list"
        >
          <button
            v-for="n in inv.nutrients"
            :key="n.id"
            type="button"
            class="row"
            @click="openNut(n)"
          >
            <span class="row-text">
              <span class="row-top">
                <strong>{{ n.name }}</strong>
                <span
                  v-if="nutrientLow(inventory.left(n), n)"
                  class="badge low"
                >{{ t('manage.inventory.low') }}</span>
              </span>
              <span
                class="progress"
                :class="{ warn: nutrientLow(inventory.left(n), n) }"
                role="progressbar"
                :aria-valuenow="Math.round(pct(n))"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-label="n.name"
              ><div :style="{ width: `${pct(n)}%` }" /></span>
              <span class="num">{{ t('manage.inventory.left', { left: formatNumber(inventory.left(n), 0), total: formatNumber(n.volumeMl, 0) }) }}</span>
            </span>
          </button>
        </div>
        <p class="hint">
          {{ t('manage.inventory.nutrientsHint') }}
        </p>
        <button
          type="button"
          class="btn btn-block"
          @click="openNut()"
        >
          <UIcon
            name="i-tabler-plus"
            class="size-4"
          /> {{ t('manage.inventory.addNutrient') }}
        </button>
      </section>

      <!-- Supplies -->
      <section
        v-else
        class="rise list-wrap"
      >
        <EmptyState
          v-if="!inv.supplies.length"
          icon="tools"
          :title="t('manage.inventory.noSuppliesTitle')"
          :text="t('manage.inventory.noSuppliesText')"
        />
        <div
          v-else
          class="card list"
        >
          <div
            v-for="s in inv.supplies"
            :key="s.id"
            class="row"
          >
            <button
              type="button"
              class="row-text as-btn"
              @click="openSup(s)"
            >
              <span class="row-top">
                <strong>{{ s.name }}</strong>
                <span
                  v-if="supplyLow(s)"
                  class="badge low"
                >{{ t('manage.inventory.low') }}</span>
              </span>
              <span>{{ t(`manage.inventory.kinds.${s.kind}`) }} · <span class="num">{{ formatNumber(s.quantity, 1) }} {{ unitLabel(s.unit) }}</span></span>
            </button>
            <button
              type="button"
              class="icon-btn"
              :aria-label="t('manage.inventory.useOne', { name: s.name })"
              :disabled="s.quantity <= 0"
              @click="bump(s, -1)"
            >
              <UIcon
                name="i-tabler-minus"
                class="size-4"
              />
            </button>
            <button
              type="button"
              class="icon-btn"
              :aria-label="t('manage.inventory.addOne', { name: s.name })"
              @click="bump(s, 1)"
            >
              <UIcon
                name="i-tabler-plus"
                class="size-4"
              />
            </button>
          </div>
        </div>
        <button
          type="button"
          class="btn btn-block"
          @click="openSup()"
        >
          <UIcon
            name="i-tabler-plus"
            class="size-4"
          /> {{ t('manage.inventory.addSupply') }}
        </button>
      </section>
    </div>

    <!-- Seed sheet -->
    <BottomSheet
      v-model:open="seedOpen"
      :title="seed.id ? t('manage.inventory.editSeeds') : t('manage.inventory.addSeeds')"
    >
      <template #icon>
        <GrowIcon name="germination" />
      </template>
      <form
        class="form-stack"
        novalidate
        @submit.prevent="saveSeed"
      >
        <div class="form-grid">
          <div class="field">
            <label
              class="field-label"
              for="s-strain"
            >{{ t('manage.inventory.strain') }}</label>
            <input
              id="s-strain"
              v-model="seed.strain"
              class="input"
              maxlength="60"
              :class="{ invalid: seedSubmitted && !seed.strain.trim() }"
              placeholder="Northern Lights"
            >
          </div>
          <div class="field">
            <label
              class="field-label"
              for="s-breeder"
            >{{ t('manage.inventory.breeder') }}</label>
            <input
              id="s-breeder"
              v-model="seed.breeder"
              class="input"
              maxlength="60"
              :placeholder="t('common.optional')"
            >
          </div>
        </div>
        <div
          class="segmented"
          role="group"
          :aria-label="t('manage.inventory.type')"
        >
          <button
            v-for="ty in (['photoperiod', 'autoflower'] as const)"
            :key="ty"
            type="button"
            :aria-pressed="seed.type === ty"
            @click="seed.type = ty"
          >
            {{ t(`manage.inventory.types.${ty}`) }}
          </button>
        </div>
        <div
          class="segmented"
          role="group"
          :aria-label="t('manage.inventory.sexLabel')"
        >
          <button
            v-for="sx in (['feminized', 'regular'] as const)"
            :key="sx"
            type="button"
            :aria-pressed="seed.sex === sx"
            @click="seed.sex = sx"
          >
            {{ t(`manage.inventory.sex.${sx}`) }}
          </button>
        </div>
        <div class="form-grid">
          <div class="field">
            <label
              class="field-label"
              for="s-count"
            >{{ t('manage.inventory.count') }}</label>
            <input
              id="s-count"
              v-model.number="seed.count"
              class="input num"
              :class="{ invalid: seedSubmitted && (seed.count === '' || Number(seed.count) < 0) }"
              type="number"
              inputmode="numeric"
              min="0"
              step="1"
            >
          </div>
          <div class="field">
            <label
              class="field-label"
              for="s-date"
            >{{ t('manage.inventory.purchaseDate') }}</label>
            <input
              id="s-date"
              v-model="seed.purchaseDate"
              class="input"
              type="date"
            >
          </div>
        </div>
        <div
          v-if="!seed.id"
          class="field"
        >
          <label
            class="field-label"
            for="s-price"
          >{{ t('manage.inventory.price', { cur: cur === 'CZK' ? 'Kč' : '€' }) }}</label>
          <input
            id="s-price"
            v-model.number="seed.price"
            class="input num"
            type="number"
            inputmode="decimal"
            min="0"
            step="any"
            :placeholder="t('common.optional')"
          >
          <span class="field-hint">{{ t('manage.inventory.priceHint') }}</span>
        </div>
        <div class="field">
          <label
            class="field-label"
            for="s-note"
          >{{ t('manage.inventory.note') }}</label>
          <input
            id="s-note"
            v-model="seed.note"
            class="input"
            maxlength="300"
            :placeholder="t('common.optional')"
          >
        </div>
        <button
          v-if="seed.id"
          type="button"
          class="btn btn-danger"
          @click="removeItem('seeds', seed.id, seed.strain)"
        >
          {{ t('common.delete') }}
        </button>
      </form>
      <template #footer>
        <button
          type="button"
          class="btn"
          @click="seedOpen = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="saveSeed"
        >
          {{ t('common.save') }}
        </button>
      </template>
    </BottomSheet>

    <!-- Nutrient sheet -->
    <BottomSheet
      v-model:open="nutOpen"
      :title="nut.id ? t('manage.inventory.editNutrient') : t('manage.inventory.addNutrient')"
      icon-color="#b58cf5"
    >
      <template #icon>
        <GrowIcon name="feed" />
      </template>
      <form
        class="form-stack"
        novalidate
        @submit.prevent="saveNut"
      >
        <div class="field">
          <label
            class="field-label"
            for="n-name"
          >{{ t('manage.inventory.product') }}</label>
          <input
            id="n-name"
            v-model="nut.name"
            class="input"
            maxlength="60"
            :class="{ invalid: nutSubmitted && !nut.name.trim() }"
            placeholder="Bio-Grow"
          >
          <span class="field-hint">{{ t('manage.inventory.productHint') }}</span>
        </div>
        <div class="form-grid">
          <div class="field">
            <label
              class="field-label"
              for="n-vol"
            >{{ t('manage.inventory.bottle') }}</label>
            <input
              id="n-vol"
              v-model.number="nut.volumeMl"
              class="input num"
              :class="{ invalid: nutSubmitted && !(Number(nut.volumeMl) > 0) }"
              type="number"
              inputmode="numeric"
              min="1"
              @change="onVolume"
            >
          </div>
          <div class="field">
            <label
              class="field-label"
              for="n-left"
            >{{ t('manage.inventory.leftMl') }}</label>
            <input
              id="n-left"
              v-model.number="nut.leftMl"
              class="input num"
              :class="{ invalid: nutSubmitted && (nut.leftMl === '' || Number(nut.leftMl) < 0) }"
              type="number"
              inputmode="numeric"
              min="0"
            >
          </div>
        </div>
        <div class="chips">
          <button
            v-for="v in [250, 500, 1000, 5000]"
            :key="v"
            type="button"
            class="chip num"
            :aria-pressed="nut.volumeMl === v"
            @click="nut.volumeMl = v; onVolume()"
          >
            {{ formatVolume(v) }}
          </button>
        </div>
        <div
          v-if="!nut.id"
          class="field"
        >
          <label
            class="field-label"
            for="n-price"
          >{{ t('manage.inventory.price', { cur: cur === 'CZK' ? 'Kč' : '€' }) }}</label>
          <input
            id="n-price"
            v-model.number="nut.price"
            class="input num"
            type="number"
            inputmode="decimal"
            min="0"
            step="any"
            :placeholder="t('common.optional')"
          >
          <span class="field-hint">{{ t('manage.inventory.priceHint') }}</span>
        </div>
        <button
          v-if="nut.id"
          type="button"
          class="btn btn-danger"
          @click="removeItem('nutrients', nut.id, nut.name)"
        >
          {{ t('common.delete') }}
        </button>
      </form>
      <template #footer>
        <button
          type="button"
          class="btn"
          @click="nutOpen = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="saveNut"
        >
          {{ t('common.save') }}
        </button>
      </template>
    </BottomSheet>

    <!-- Supply sheet -->
    <BottomSheet
      v-model:open="supOpen"
      :title="sup.id ? t('manage.inventory.editSupply') : t('manage.inventory.addSupply')"
    >
      <template #icon>
        <UIcon name="i-tabler-shovel" />
      </template>
      <form
        class="form-stack"
        novalidate
        @submit.prevent="saveSup"
      >
        <div
          class="segmented"
          role="group"
          :aria-label="t('manage.inventory.kindLabel')"
        >
          <button
            v-for="k in (['substrate', 'pot', 'other'] as const)"
            :key="k"
            type="button"
            :aria-pressed="sup.kind === k"
            @click="onSupKind(k)"
          >
            {{ t(`manage.inventory.kinds.${k}`) }}
          </button>
        </div>
        <div class="field">
          <label
            class="field-label"
            for="u-name"
          >{{ t('manage.inventory.itemName') }}</label>
          <input
            id="u-name"
            v-model="sup.name"
            class="input"
            maxlength="60"
            :class="{ invalid: supSubmitted && !sup.name.trim() }"
            :placeholder="t(`manage.inventory.itemPlaceholder.${sup.kind}`)"
          >
        </div>
        <div class="form-grid">
          <div class="field">
            <label
              class="field-label"
              for="u-qty"
            >{{ t('manage.inventory.quantity') }}</label>
            <input
              id="u-qty"
              v-model.number="sup.quantity"
              class="input num"
              type="number"
              inputmode="decimal"
              min="0"
              step="any"
            >
          </div>
          <div class="field">
            <label
              class="field-label"
              for="u-unit"
            >{{ t('manage.inventory.unit') }}</label>
            <select
              id="u-unit"
              v-model="sup.unit"
              class="input"
            >
              <option
                v-for="u in (['L', 'kg', 'pcs'] as const)"
                :key="u"
                :value="u"
              >
                {{ unitLabel(u) }}
              </option>
            </select>
          </div>
        </div>
        <div class="form-grid">
          <div class="field">
            <label
              class="field-label"
              for="u-low"
            >{{ t('manage.inventory.lowAt') }}</label>
            <input
              id="u-low"
              v-model.number="sup.lowAt"
              class="input num"
              type="number"
              inputmode="decimal"
              min="0"
              step="any"
              :placeholder="t('common.optional')"
            >
          </div>
          <div
            v-if="!sup.id"
            class="field"
          >
            <label
              class="field-label"
              for="u-price"
            >{{ t('manage.inventory.price', { cur: cur === 'CZK' ? 'Kč' : '€' }) }}</label>
            <input
              id="u-price"
              v-model.number="sup.price"
              class="input num"
              type="number"
              inputmode="decimal"
              min="0"
              step="any"
              :placeholder="t('common.optional')"
            >
          </div>
        </div>
        <button
          v-if="sup.id"
          type="button"
          class="btn btn-danger"
          @click="removeItem('supplies', sup.id, sup.name)"
        >
          {{ t('common.delete') }}
        </button>
      </form>
      <template #footer>
        <button
          type="button"
          class="btn"
          @click="supOpen = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          @click="saveSup"
        >
          {{ t('common.save') }}
        </button>
      </template>
    </BottomSheet>

    <!-- Plant from seed -->
    <BottomSheet
      v-model:open="plantOpen"
      :title="t('manage.inventory.plantTitle')"
    >
      <template #icon>
        <GrowIcon name="germination" />
      </template>
      <form
        class="form-stack"
        novalidate
        @submit.prevent="plantIt"
      >
        <p
          v-if="plantSeedRef"
          class="field-hint"
        >
          {{ t('manage.inventory.plantHint', { strain: plantSeedRef.strain, n: plantSeedRef.count - 1 }) }}
        </p>
        <div class="field">
          <label
            class="field-label"
            for="p-name"
          >{{ t('manage.inventory.plantName') }}</label>
          <input
            id="p-name"
            v-model="plantForm.name"
            class="input"
            maxlength="60"
          >
        </div>
        <div class="field">
          <label
            class="field-label"
            for="p-date"
          >{{ t('manage.inventory.germinated') }}</label>
          <input
            id="p-date"
            v-model="plantForm.startDate"
            class="input"
            type="date"
            :max="todayISO()"
          >
        </div>
        <div class="field">
          <span class="field-label">{{ t('manage.inventory.medium') }}</span>
          <div class="chips">
            <button
              v-for="m in MEDIA"
              :key="m"
              type="button"
              class="chip"
              :aria-pressed="plantForm.medium === m"
              @click="plantForm.medium = m"
            >
              {{ t(`kit.media.${m}`) }}
            </button>
          </div>
        </div>
        <div class="field">
          <span class="field-label">{{ t('manage.inventory.location') }}</span>
          <div class="chips">
            <button
              v-for="l in LOCATIONS"
              :key="l"
              type="button"
              class="chip"
              :aria-pressed="plantForm.location === l"
              @click="plantForm.location = l"
            >
              {{ t(`kit.location.${l}`) }}
            </button>
          </div>
        </div>
      </form>
      <template #footer>
        <button
          type="button"
          class="btn"
          @click="plantOpen = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!plantForm.name.trim()"
          @click="plantIt"
        >
          {{ t('manage.inventory.plantSeed') }}
        </button>
      </template>
    </BottomSheet>
  </div>
</template>

<style scoped>
.tab-count {
  font-size: 12px;
  color: var(--text-3);
}

.list-wrap {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.item {
  padding: 12px 12px 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.item-main {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}

.item-text,
.row-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 13px;
  color: var(--text-2);
}

.item-text strong,
.row-text strong {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.faint {
  color: var(--text-3);
  font-size: 12px;
}

.qty {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.qty strong {
  font-size: 24px;
  font-weight: 600;
  line-height: 1.1;
}

.unit-txt {
  font-size: 12px;
  color: var(--text-3);
}

.low {
  color: var(--amber);
}

.compact {
  min-height: 40px;
  font-size: 14px;
}

.list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 64px;
  padding: 12px 12px 12px 14px;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  width: 100%;
}

.row + .row {
  border-top: 1px solid var(--line);
}

button.row:active {
  background: var(--surface-2);
}

.as-btn {
  border: 0;
  padding: 0;
  background: transparent;
  text-align: left;
}

.row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.progress {
  display: block;
  margin: 4px 0 2px;
}

.progress.warn > div {
  background: var(--amber);
}

.hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-3);
}
</style>
