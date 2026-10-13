<script setup lang="ts">
import { formatDuration, lightState } from '~/utils/light'

const { t } = useI18n()
useHead({ title: () => t('organize.spaces.title') })

const { state } = useGrow()
const { spaces } = useSpaces()
const creating = ref(false)

const now = ref(new Date())
let clock: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  clock = setInterval(() => (now.value = new Date()), 30_000)
})
onBeforeUnmount(() => clearInterval(clock))

const unassigned = computed(() => state.plants.filter(p => !p.archived && !p.spaceId).length)

const rows = computed(() => spaces.value.map((s) => {
  const plants = plantsInSpace(state.plants, s.id)
  const sched = spaceSchedule(s)
  const light = sched ? lightState(sched.lightsOn, sched.hours, now.value) : null
  const lightText = !sched || !light
    ? t('organize.space.natural')
    : sched.hours >= 24
      ? `${t('ring.lightsOnLead')} ${t('ring.allDay')}`
      : sched.hours <= 0
        ? `${t('ring.lightsLead')} ${t('ring.off')}`
        : `${light.isOn ? t('ring.offIn') : t('ring.onIn')} ${formatDuration(light.minutesLeft)}`
  return { space: s, plants, lit: !!light?.isOn, lightText }
}))
</script>

<template>
  <div>
    <AppHeader
      :title="t('organize.spaces.title')"
      :subtitle="spaces.length ? t('organize.spaces.subtitle', { n: spaces.length }) : undefined"
      back
    />
    <div class="page">
      <EmptyState
        v-if="!spaces.length"
        icon="plants"
        :title="t('organize.spaces.emptyTitle')"
        :text="t('organize.spaces.emptyText')"
      >
        <button
          type="button"
          class="btn btn-primary"
          @click="creating = true"
        >
          <UIcon
            name="i-tabler-plus"
            class="size-5"
          /> {{ t('organize.spaces.create') }}
        </button>
      </EmptyState>

      <ul
        v-else
        class="space-list rise"
      >
        <li
          v-for="r in rows"
          :key="r.space.id"
        >
          <NuxtLink
            :to="`/spaces/${r.space.id}`"
            class="card space"
          >
            <span
              class="space-icon"
              :class="{ lit: r.lit }"
            >
              <UIcon
                name="i-tabler-tent"
                class="size-6"
              />
            </span>
            <span class="space-body">
              <span class="space-name">{{ r.space.name }}</span>
              <span class="space-sub">{{ spaceSubline(r.space) }}</span>
              <span class="space-meta">
                <span class="num">{{ t('common.plants', { n: r.plants.length }) }}</span>
                <span aria-hidden="true">·</span>
                <span :class="{ lamp: r.lit }">{{ r.lightText }}</span>
              </span>
            </span>
            <span
              v-if="r.plants.length"
              class="space-thumbs"
              aria-hidden="true"
            >
              <span
                v-for="p in r.plants.slice(0, 3)"
                :key="p.id"
                class="thumb"
              >
                <PlantPhoto
                  :photo-id="p.photoId"
                  :stage="p.stage"
                />
              </span>
            </span>
          </NuxtLink>
        </li>
      </ul>

      <p
        v-if="spaces.length && unassigned"
        class="unassigned muted"
      >
        {{ t('organize.spaces.unassigned', { n: unassigned }) }}
      </p>
    </div>

    <button
      v-if="spaces.length"
      type="button"
      class="fab"
      :aria-label="t('organize.spaces.create')"
      @click="creating = true"
    >
      <UIcon name="i-tabler-plus" />
    </button>

    <SpacesSpaceSheet
      v-model:open="creating"
      @saved="id => navigateTo(`/spaces/${id}`)"
    />
  </div>
</template>

<style scoped>
.space-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.space {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  color: inherit;
  text-decoration: none;
  transition: transform var(--dur-fast) var(--ease-out);
}

.space:active {
  transform: scale(0.985);
}

.space-icon {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-control);
  background: var(--surface-3);
  color: var(--text-2);
}

.space-icon.lit {
  background: var(--lamp-soft);
  color: var(--amber);
}

.space-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.space-name {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.space-sub {
  font-size: 13px;
  color: var(--text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.space-meta {
  display: flex;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-3);
}

.lamp {
  color: var(--amber);
}

.space-thumbs {
  display: flex;
  flex-shrink: 0;
}

.thumb {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--surface);
}

.thumb + .thumb {
  margin-left: -10px;
}

.unassigned {
  margin: 0;
  font-size: 13px;
  text-align: center;
}
</style>
