<script setup lang="ts">
// Tools: links to feeding schedules, costs, inventory and legal limits.
const { t } = useI18n()
const { lowCount } = useInventory()

const LINKS = [
  { to: '/feeding', key: 'feeding', icon: 'feed', tone: '#b58cf5' },
  { to: '/costs', key: 'costs', icon: 'lamp', tone: 'var(--amber)' },
  { to: '/inventory', key: 'inventory', icon: 'i-tabler-box', tone: 'var(--green)' },
  { to: '/legal', key: 'legal', icon: 'i-tabler-scale', tone: 'var(--blue)' }
] as const
</script>

<template>
  <section aria-labelledby="manage-links-title">
    <div class="section-head">
      <h2
        id="manage-links-title"
        class="section-title"
      >
        {{ t('kit.links.title') }}
      </h2>
    </div>
    <nav
      class="card links"
      aria-labelledby="manage-links-title"
    >
      <NuxtLink
        v-for="l in LINKS"
        :key="l.key"
        :to="l.to"
        class="row"
      >
        <span
          class="tile"
          :style="{ color: l.tone }"
        ><GrowIcon :name="l.icon" /></span>
        <span class="text">
          <span class="title">{{ t(`kit.links.${l.key}.title`) }}</span>
          <span class="desc">{{ t(`kit.links.${l.key}.desc`) }}</span>
        </span>
        <span
          v-if="l.key === 'inventory' && lowCount"
          class="badge low"
        >{{ t('kit.links.low', { n: lowCount }) }}</span>
        <UIcon
          name="i-tabler-chevron-right"
          class="size-5 go"
        />
      </NuxtLink>
    </nav>
  </section>
</template>

<style scoped>
.links {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 64px;
  padding: 10px 12px 10px 14px;
  color: inherit;
  text-decoration: none;
  transition: background var(--dur-fast) ease;
}

.row + .row {
  border-top: 1px solid var(--line);
}

.row:active {
  background: var(--surface-2);
}

.tile {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, currentColor 14%, transparent);
  font-size: 22px;
}

.text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title {
  font-size: 15px;
  font-weight: 600;
}

.desc {
  font-size: 13px;
  color: var(--text-2);
}

.low {
  color: var(--amber);
}

.go {
  flex-shrink: 0;
  color: var(--text-3);
}
</style>
