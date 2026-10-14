<script setup lang="ts">
import { BOTTLE_SIZES, bottlePrice, EQUIPMENT, PRODUCTS, SCANNER_PRICE, STRAINS, TREATMENTS } from '~~/shared/game/content/catalog'
import type { L10n } from '~~/shared/game/types'
import { gameText, seedCount } from '~/utils/gameUi'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
useHead({ title: () => t('game.shop.title') })
useGameClock()
const game = useGame()
const feedback = useGameFeedback()

const TABS = ['gear', 'seeds', 'nutrients', 'treatments', 'scanner'] as const
type Tab = typeof TABS[number]
const tab = computed<Tab>({
  get: () => (TABS.includes(route.query.tab as Tab) ? route.query.tab as Tab : 'gear'),
  set: v => router.replace({ query: { ...route.query, tab: v } })
})

// shallow copy per version: the sim mutates in place, so the same object would not re-render
const s = computed(() => {
  void game.version.value
  const st = game.state.value
  return st ? { ...st } : null
})

interface Item {
  id: string
  name: string
  desc: string
  price: number
  unlock: number
  meta: string
  kind: 'gear' | 'stock'
  /** item id the sim's buy action takes */
  buyId: string
  /** nutrients: one buy button per bottle size */
  sizes?: { ml: number, price: number, buyId: string }[]
  installedIn: string | null
  owned: boolean
}

const installedIn = (id: string) => {
  const tents = s.value?.tents ?? []
  const i = tents.findIndex(x => x.tentItem === id || x.light === id || x.gear.includes(id))
  return i === -1 ? null : t('game.tent.name', { n: i + 1 })
}

const text = (x: L10n | string) => gameText(x)

const SIZES = Object.keys(BOTTLE_SIZES).map(Number).sort((a, b) => a - b)
const SMALL_BOTTLE = SIZES[0] ?? 250
const bottleSizes = (p: (typeof PRODUCTS)[number]) => SIZES.map(ml => ({ ml, price: bottlePrice(p, ml) ?? 0, buyId: `${p.id}@${ml}` }))

const items = computed<Item[]>(() => {
  const st = s.value
  if (!st) return []
  const inv = st.inventory
  switch (tab.value) {
    case 'gear':
      return [...EQUIPMENT].sort((a, b) => a.unlockLevel - b.unlockLevel || a.price - b.price).map((e) => {
        const count = st.owned.filter(x => x === e.id).length
        if (e.slot === 'pot') {
          // pots are stock, used up by sowing and transplanting
          return { id: e.id, buyId: e.id, name: text(e.name), desc: text(e.blurb), price: e.price, unlock: e.unlockLevel, kind: 'stock', owned: false, installedIn: null, meta: t('game.shop.potsFree', { n: inv[e.id] ?? 0 }) }
        }
        const where = installedIn(e.id)
        const spare = count > (st.tents.filter(x => x.tentItem === e.id || x.light === e.id || x.gear.includes(e.id)).length)
        return { id: e.id, buyId: e.id, name: text(e.name), desc: text(e.blurb), price: e.price, unlock: e.unlockLevel, kind: 'gear', owned: spare, installedIn: spare ? null : where, meta: t(`game.shop.slot.${e.slot}`) }
      })
    case 'seeds':
      return STRAINS.map(x => ({ id: x.id, buyId: `seed:${x.id}`, name: x.name, desc: text(x.blurb), price: x.price, unlock: x.unlockLevel, kind: 'stock', owned: false, installedIn: null, meta: t('game.shop.seedsOwned', { n: seedCount(inv, x.id) }) }))
    case 'nutrients':
      return PRODUCTS.map(x => ({ id: x.id, buyId: `${x.id}@${SMALL_BOTTLE}`, name: text(x.name), desc: t(`game.shop.product.${x.kind}`), price: bottlePrice(x, SMALL_BOTTLE) ?? x.price, sizes: bottleSizes(x), unlock: x.unlockLevel, kind: 'stock', owned: false, installedIn: null, meta: t('game.shop.mlOwned', { n: Math.round(inv[x.id] ?? 0) }) }))
    case 'treatments':
      return TREATMENTS.filter(x => x.price > 0).map(x => ({ id: x.id, buyId: x.id, name: text(x.name), desc: text(x.blurb), price: x.price, unlock: x.unlockLevel, kind: 'stock', owned: false, installedIn: null, meta: t('game.shop.usesOwned', { n: inv[x.id] ?? 0 }) }))
    default:
      return []
  }
})

const credits = computed(() => s.value?.inventory['scanner-credit'] ?? 0)

function buy(item: Pick<Item, 'buyId' | 'name'>, qty = 1) {
  feedback(game.act({ t: 'buy', itemId: item.buyId, qty }), t('game.shop.bought', { name: item.name }))
}

const pickFor = ref<Item | null>(null)
const pickOpen = computed({
  get: () => !!pickFor.value,
  set: (v) => {
    if (!v) pickFor.value = null
  }
})

function install(item: Item, tentId?: string) {
  const tents = s.value?.tents ?? []
  const target = tentId ?? (tents.length === 1 ? tents[0]!.id : null)
  if (!target) {
    pickFor.value = item
    return
  }
  pickFor.value = null
  feedback(game.act({ t: 'install', tentId: target, itemId: item.id }), t('game.shop.installed', { name: item.name }))
}
</script>

<template>
  <div>
    <AppHeader
      :title="t('game.shop.title')"
      back
    >
      <template #actions>
        <span
          v-if="s"
          class="wallet num"
          :aria-label="t('game.grower.coinsLabel', { n: s.coins })"
        >
          <UIcon
            name="i-tabler-coin"
            aria-hidden="true"
          />
          {{ s.coins }}
        </span>
      </template>
    </AppHeader>

    <GameGate>
      <div
        v-if="s"
        class="page"
      >
        <div
          class="chips tabs"
          role="tablist"
          :aria-label="t('game.shop.title')"
        >
          <button
            v-for="x in TABS"
            :id="`shop-tab-${x}`"
            :key="x"
            type="button"
            role="tab"
            class="chip"
            :class="{ active: tab === x }"
            :aria-selected="tab === x"
            aria-controls="shop-panel"
            @click="tab = x"
          >
            {{ t(`game.shop.tabs.${x}`) }}
          </button>
        </div>

        <div
          id="shop-panel"
          :key="tab"
          role="tabpanel"
          :aria-labelledby="`shop-tab-${tab}`"
          class="rise panel"
        >
          <div
            v-if="tab === 'scanner'"
            class="card scanner"
          >
            <span class="scan-tile">
              <UIcon name="i-tabler-scan" />
            </span>
            <p class="scan-title">
              {{ t('game.shop.scanner.title') }}
            </p>
            <p class="scan-desc">
              {{ t('game.shop.scanner.desc') }}
            </p>
            <p class="scan-owned num">
              {{ t('game.shop.scanner.owned', { n: credits }) }}
            </p>
            <div class="scan-buy">
              <button
                type="button"
                class="btn btn-primary"
                :disabled="s.coins < SCANNER_PRICE"
                @click="buy({ buyId: 'scanner-credit', name: t('game.shop.scanner.one') })"
              >
                {{ t('game.shop.scanner.buyOne', { price: SCANNER_PRICE }) }}
              </button>
              <button
                type="button"
                class="btn"
                :disabled="s.coins < SCANNER_PRICE * 3"
                @click="buy({ buyId: 'scanner-credit', name: t('game.shop.scanner.three') }, 3)"
              >
                {{ t('game.shop.scanner.buyThree', { price: SCANNER_PRICE * 3 }) }}
              </button>
            </div>
          </div>

          <EmptyState
            v-else-if="!items.length"
            icon="i-tabler-shopping-bag"
            :title="t('game.shop.emptyTitle')"
            :text="t('game.shop.emptyText')"
          />

          <ul
            v-else
            class="card list"
          >
            <li
              v-for="item in items"
              :key="item.id"
              class="item"
              :class="{ locked: item.unlock > s.level }"
            >
              <div class="item-text">
                <span class="item-name">{{ item.name }}</span>
                <span class="item-desc">{{ item.desc }}</span>
                <span class="item-meta num">{{ item.meta }}</span>
                <span
                  v-if="item.sizes && item.unlock <= s.level"
                  class="sizes"
                >
                  <button
                    v-for="b in item.sizes"
                    :key="b.ml"
                    type="button"
                    class="btn buy num"
                    :disabled="s.coins < b.price"
                    :aria-label="t('game.shop.buyBottle', { name: item.name, ml: b.ml, price: b.price })"
                    @click="buy({ buyId: b.buyId, name: item.name })"
                  >
                    {{ t('game.shop.bottleSize', { ml: b.ml }) }}
                    <span class="size-price">
                      <UIcon
                        name="i-tabler-coin"
                        aria-hidden="true"
                      />{{ b.price }}
                    </span>
                  </button>
                </span>
              </div>
              <div class="item-side">
                <span
                  v-if="item.unlock > s.level"
                  class="lock"
                >
                  <UIcon
                    name="i-tabler-lock"
                    aria-hidden="true"
                  />
                  {{ t('game.shop.level', { n: item.unlock }) }}
                </span>
                <span
                  v-else-if="item.installedIn"
                  class="state-ok"
                >
                  <UIcon
                    name="i-tabler-check"
                    aria-hidden="true"
                  />
                  {{ item.installedIn }}
                </span>
                <button
                  v-else-if="item.owned"
                  type="button"
                  class="btn btn-soft buy"
                  @click="install(item)"
                >
                  {{ t('game.shop.install') }}
                </button>
                <button
                  v-else-if="!item.sizes"
                  type="button"
                  class="btn buy num"
                  :disabled="s.coins < item.price"
                  :aria-label="t('game.shop.buyAria', { name: item.name, price: item.price })"
                  @click="buy(item)"
                >
                  <UIcon
                    name="i-tabler-coin"
                    aria-hidden="true"
                  />
                  {{ item.price }}
                </button>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </GameGate>

    <BottomSheet
      v-model:open="pickOpen"
      :title="t('game.shop.pickTent')"
      icon="tent"
    >
      <div class="tent-pick">
        <button
          v-for="(tent, i) in s?.tents ?? []"
          :key="tent.id"
          type="button"
          class="btn btn-block"
          @click="pickFor && install(pickFor, tent.id)"
        >
          {{ t('game.tent.name', { n: i + 1 }) }}
        </button>
      </div>
    </BottomSheet>
  </div>
</template>

<style scoped>
.wallet {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: var(--radius-control);
  background: var(--surface);
  border: 1px solid var(--line);
  font-size: 15px;
  font-weight: 600;
}

.wallet .iconify {
  color: var(--text-2);
}

.tabs {
  margin: 0 -16px;
  padding: 0 16px 2px;
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px 12px 14px;
}

.item + .item {
  border-top: 1px solid var(--line);
}

.item-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  font-size: 15px;
  font-weight: 600;
}

.item-desc {
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.45;
}

.item-meta {
  font-size: 12px;
  color: var(--text-3);
}

.locked .item-name {
  color: var(--text-2);
}

.item-side {
  flex-shrink: 0;
}

.sizes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 10px;
}

.sizes .buy {
  flex-direction: column;
  gap: 0;
  min-height: 52px;
  padding: 4px 6px;
  font-size: 14px;
  line-height: 1.25;
}

.size-price {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 13px;
  color: var(--text-2);
}

.buy {
  min-height: 44px;
  padding: 0 14px;
  gap: 6px;
}

.lock,
.state-ok {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-3);
  white-space: nowrap;
}

.state-ok {
  color: var(--green);
}

.scanner {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 18px 16px;
}

.scan-tile {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin-bottom: 6px;
  border-radius: var(--radius-control);
  background: var(--surface-2);
  color: var(--text);
  font-size: 26px;
}

.scanner p {
  margin: 0;
}

.scan-title {
  font-size: 16px;
  font-weight: 600;
}

.scan-desc {
  font-size: 14px;
  color: var(--text-2);
  line-height: 1.5;
}

.scan-owned {
  font-size: 13px;
  color: var(--text-3);
}

.scan-buy {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  width: 100%;
  margin-top: 10px;
}

.tent-pick {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 8px;
}
</style>
