<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ tentId: string | null }>()
const { t } = useI18n()
const { confirm } = useConfirm()
const game = useGame()
const feedback = useGameFeedback()

const tent = computed(() => {
  void game.version.value
  const x = game.state.value?.tents.find(x => x.id === props.tentId)
  return x ? { ...x } : null
})
const plants = computed(() => (tent.value ? tent.value.plantIds.map(id => game.state.value!.plants[id]).filter(p => p && !p.dead) : []))
const hasPhotoInVeg = computed(() => plants.value.some(p => p!.genome.kind === 'photo' && !p!.flipAtH && (p!.stage === 'veg' || p!.stage === 'seedling')))

const hours = ref(18)
const dim = ref(100)
const temp = ref(25)
const rh = ref(60)

watch(open, (v) => {
  if (!v || !tent.value) return
  hours.value = tent.value.lightHours
  dim.value = Math.round(tent.value.dim * 100)
  temp.value = tent.value.climate.tempC
  rh.value = tent.value.climate.rh
})

const HOURS = [12, 18, 20]

function save() {
  if (!tent.value) return
  const id = tent.value.id
  let ok = true
  if (hours.value !== tent.value.lightHours || dim.value / 100 !== tent.value.dim) {
    ok = feedback(game.act({ t: 'light', tentId: id, lightHours: hours.value, dim: dim.value / 100 })) && ok
  }
  if (temp.value !== tent.value.climate.tempC || rh.value !== tent.value.climate.rh) {
    ok = feedback(game.act({ t: 'climate', tentId: id, tempC: temp.value, rh: rh.value })) && ok
  }
  if (ok) {
    useNotify().notify(t('game.tent.saved'))
    open.value = false
  }
}

async function flip() {
  if (!tent.value) return
  const yes = await confirm({ title: t('game.tent.flipTitle'), message: t('game.tent.flipText'), confirmLabel: t('game.tent.flipConfirm') })
  if (!yes) return
  if (feedback(game.act({ t: 'flip', tentId: tent.value.id }), t('game.tent.flipped'))) open.value = false
}
</script>

<template>
  <BottomSheet
    v-model:open="open"
    :title="t('game.tent.sheetTitle')"
    icon="lamp"
    icon-color="var(--amber)"
  >
    <div
      v-if="tent"
      class="form-stack"
    >
      <div class="field">
        <span
          id="tent-hours"
          class="field-label"
        >{{ t('game.tent.hours') }}</span>
        <div
          class="segmented"
          role="group"
          aria-labelledby="tent-hours"
        >
          <button
            v-for="h in HOURS"
            :key="h"
            type="button"
            class="num"
            :aria-pressed="hours === h"
            @click="hours = h"
          >
            {{ t('game.tent.schedule', { on: h, off: 24 - h }) }}
          </button>
        </div>
        <span class="field-hint">{{ t('game.tent.hoursHint') }}</span>
      </div>

      <GameRange
        v-model="dim"
        :label="t('game.tent.dim')"
        :min="20"
        :max="100"
        :step="5"
        :display="`${dim} %`"
        tone="amber"
        :hint="t('game.tent.dimHint')"
      />
      <GameRange
        v-model="temp"
        :label="t('game.tent.temp')"
        :min="16"
        :max="32"
        :step="0.5"
        :display="`${temp} °C`"
      />
      <GameRange
        v-model="rh"
        :label="t('game.tent.rh')"
        :min="30"
        :max="80"
        :step="1"
        :display="`${rh} %`"
        tone="blue"
        :hint="t('game.tent.climateHint')"
      />

      <div
        v-if="hasPhotoInVeg"
        class="flip"
      >
        <p>{{ t('game.tent.flipLead') }}</p>
        <button
          type="button"
          class="btn btn-lamp btn-block"
          @click="flip"
        >
          {{ t('game.tent.flipButton') }}
        </button>
      </div>
    </div>
    <template #footer>
      <button
        type="button"
        class="btn"
        @click="open = false"
      >
        {{ t('dialog.cancel') }}
      </button>
      <button
        type="button"
        class="btn btn-primary"
        @click="save"
      >
        {{ t('game.tent.save') }}
      </button>
    </template>
  </BottomSheet>
</template>

<style scoped>
.flip {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.flip p {
  margin: 0;
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.5;
}
</style>
