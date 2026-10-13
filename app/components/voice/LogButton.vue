<script setup lang="ts">
import type { EntryType, JournalEntry } from '~/types/grow'
import { addDays } from '~/utils/date'
import { isGrowing } from '~/utils/stages'
import { parseVoiceLog, type VoiceDraft } from '~/utils/voiceParse'

const props = defineProps<{
  /** fixed plant (plant page); otherwise the plant is picked from the sentence or by hand */
  plantId?: string | null
}>()

const { t, locale } = useI18n()
const grow = useGrow()
const today = useToday()
const speech = useSpeech()
const canSpeak = speechSupported()

const open = ref(false)
const text = ref('')
const plantChoice = ref<string | null>(null)
const plantPicked = ref(false)

const plants = computed(() => grow.state.plants.filter(p => !p.archived && isGrowing(p)))
const draft = computed<VoiceDraft>(() => parseVoiceLog(text.value, { plants: plants.value.map(p => ({ id: p.id, name: p.name })), lang: locale.value }))
const plantId = computed(() => props.plantId ?? plantChoice.value)

// follow the spoken plant name until the user picks one by hand
watch(() => draft.value.plantId, (id) => {
  if (!plantPicked.value && id) plantChoice.value = id
})

function show() {
  text.value = ''
  plantPicked.value = false
  plantChoice.value = props.plantId ?? (plants.value.length === 1 ? plants.value[0]!.id : null)
  open.value = true
  if (canSpeak) listen()
}

function listen() {
  if (speech.state.value === 'listening') {
    speech.stop()
    return
  }
  speech.start(locale.value === 'cs' ? 'cs-CZ' : 'en-US', (said) => {
    if (said) text.value = said
  })
}

// live transcript while listening
watch(speech.transcript, (v) => {
  if (speech.state.value === 'listening' && v) text.value = v
})

watch(open, (v) => {
  if (!v) speech.cancel()
})

function pickPlant(id: string) {
  plantChoice.value = id
  plantPicked.value = true
}

// ── Preview ───────────────────────────────────────────────────────
const info = computed(() => entryInfo(draft.value.type))
const chips = computed(() => {
  const d = draft.value
  const out: string[] = []
  if (d.dayOffset === -1) out.push(t('voice.yesterday'))
  if (d.dayOffset === -2) out.push(t('voice.dayBefore'))
  if (d.amountMl !== null) out.push(formatVolume(d.amountMl))
  if (d.nutrients) out.push(...d.nutrients.split(', '))
  if (d.ph !== null) out.push(`pH ${formatNumber(d.ph, 2)}`)
  if (d.ec !== null) out.push(`EC ${formatNumber(d.ec, 2)}`)
  if (d.heightCm !== null) out.push(`${formatNumber(d.heightCm)} cm`)
  if (d.tempC !== null) out.push(`${formatNumber(d.tempC)} °C`)
  if (d.humidity !== null) out.push(`${formatNumber(d.humidity, 0)} %`)
  if (d.method) out.push(trainingMethods().find(m => m.value === d.method)?.label ?? d.method)
  if (d.product) out.push(d.product)
  return out
})

// ── Hand over to the normal entry sheet ───────────────────────────
const entryOpen = ref(false)
const entryType = ref<EntryType>('note')
const entryPlant = ref('')
const entryDate = ref(today.value)
type Prefill = Partial<Pick<JournalEntry, 'amountMl' | 'nutrients' | 'ph' | 'ec' | 'note' | 'method' | 'product' | 'heightCm' | 'tempC' | 'humidity'>>
const prefill = ref<Prefill | null>(null)

function proceed() {
  const id = plantId.value
  if (!id || !text.value.trim()) return
  speech.cancel()
  const d = draft.value
  const p: Prefill = {}
  for (const k of ['amountMl', 'ph', 'ec', 'heightCm', 'tempC', 'humidity'] as const) if (d[k] !== null) p[k] = d[k]
  if (d.nutrients) p.nutrients = d.nutrients
  if (d.method) p.method = d.method
  if (d.product) p.product = d.product
  if (d.note) p.note = d.note
  entryType.value = d.type
  entryPlant.value = id
  entryDate.value = addDays(today.value, d.dayOffset)
  prefill.value = p
  open.value = false
  nextTick(() => (entryOpen.value = true))
}

const status = computed(() => {
  if (speech.state.value === 'listening') return t('voice.listening')
  if (speech.error.value) return t(`voice.errors.${speech.error.value}`)
  return canSpeak ? t('voice.tap') : t('voice.typeInstead')
})
</script>

<template>
  <button
    type="button"
    class="icon-btn"
    :aria-label="t('voice.button')"
    @click="show"
  >
    <UIcon
      name="i-tabler-microphone"
      class="size-5"
    />
  </button>

  <BottomSheet
    v-model:open="open"
    :title="t('voice.title')"
    icon="i-tabler-microphone"
  >
    <div class="form-stack">
      <div class="mic-area">
        <button
          v-if="canSpeak"
          type="button"
          class="mic"
          :class="{ on: speech.state.value === 'listening' }"
          :aria-pressed="speech.state.value === 'listening'"
          :aria-label="speech.state.value === 'listening' ? t('voice.listening') : t('voice.tap')"
          @click="listen"
        >
          <UIcon
            :name="speech.state.value === 'listening' ? 'i-tabler-player-stop-filled' : 'i-tabler-microphone'"
            class="size-8"
          />
          <span
            v-if="speech.state.value === 'listening'"
            class="bars"
            aria-hidden="true"
          ><i /><i /><i /></span>
        </button>
        <p
          class="mic-status"
          :class="{ err: !!speech.error.value }"
          role="status"
        >
          {{ status }}
        </p>
      </div>

      <div class="field">
        <label
          class="field-label"
          for="voice-text"
        >{{ t('voice.said') }}</label>
        <textarea
          id="voice-text"
          v-model="text"
          class="input"
          rows="2"
          :placeholder="t('voice.placeholder')"
          @input="speech.cancel()"
        />
      </div>

      <div
        v-if="!text.trim()"
        class="examples"
      >
        <span class="field-label">{{ t('voice.examplesTitle') }}</span>
        <ul>
          <li>{{ t('voice.examples.a') }}</li>
          <li>{{ t('voice.examples.b') }}</li>
          <li>{{ t('voice.examples.c') }}</li>
        </ul>
      </div>

      <div
        v-else
        class="result"
        aria-live="polite"
      >
        <span class="field-label">{{ t('voice.result') }}</span>
        <div class="result-card">
          <span
            class="result-type"
            :style="{ '--c': info.color }"
          >
            <GrowIcon :name="info.glyph" /> {{ info.label }}
          </span>
          <div
            v-if="chips.length"
            class="result-chips"
          >
            <span
              v-for="c in chips"
              :key="c"
              class="badge num"
            >{{ c }}</span>
          </div>
          <p
            v-else-if="draft.type === 'note'"
            class="result-hint"
          >
            {{ t('voice.nothingParsed') }}
          </p>
        </div>
      </div>

      <div
        v-if="!props.plantId"
        class="field"
      >
        <span class="field-label">{{ t('voice.pickPlant') }}</span>
        <div
          class="chips"
          role="group"
          :aria-label="t('voice.plant')"
        >
          <button
            v-for="p in plants"
            :key="p.id"
            type="button"
            class="chip"
            :aria-pressed="plantChoice === p.id"
            @click="pickPlant(p.id)"
          >
            {{ p.name }}
          </button>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        type="button"
        class="btn"
        @click="open = false"
      >
        {{ t('common.cancel') }}
      </button>
      <button
        type="button"
        class="btn btn-primary"
        :disabled="!plantId || !text.trim()"
        @click="proceed"
      >
        {{ t('voice.continue') }}
      </button>
    </template>
  </BottomSheet>

  <EntrySheet
    v-if="entryPlant"
    v-model:open="entryOpen"
    :plant-id="entryPlant"
    :type="entryType"
    :date="entryDate"
    :prefill="prefill"
  />
</template>

<style scoped>
.mic-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.mic {
  position: relative;
  width: 76px;
  height: 76px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--radius);
  background: var(--accent-soft);
  color: var(--green);
  transition: transform var(--dur-fast) var(--ease-out), background var(--dur) ease;
}

.mic:active {
  transform: scale(0.96);
}

.mic.on {
  background: var(--green);
  color: var(--on-accent);
}

.bars {
  position: absolute;
  bottom: 9px;
  left: 50%;
  display: flex;
  gap: 3px;
  transform: translateX(-50%);
}

.bars i {
  width: 3px;
  height: 8px;
  border-radius: 2px;
  background: currentColor;
  animation: bar 0.9s ease-in-out infinite;
}

.bars i:nth-child(2) {
  animation-delay: 0.15s;
}

.bars i:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes bar {
  50% {
    transform: scaleY(0.4);
  }
}

.mic-status {
  margin: 0;
  max-width: 34ch;
  text-align: center;
  font-size: 14px;
  line-height: 1.45;
  color: var(--text-2);
}

.mic-status.err {
  color: var(--amber);
}

.examples ul {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  color: var(--text-2);
}

.result-card {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: var(--radius-control);
}

.result-type {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
}

.result-type .grow-icon {
  font-size: 20px;
  color: var(--c);
}

.result-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.result-chips .badge {
  font-size: 12px;
  color: var(--text);
  background: var(--surface-3);
}

.result-hint {
  margin: 0;
  font-size: 13px;
  color: var(--text-3);
}
</style>
