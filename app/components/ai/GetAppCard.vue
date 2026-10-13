<script setup lang="ts">
const RELEASES = 'https://github.com/MildaHribal/budbuddy/releases/latest'
const { t } = useI18n()

const POINTS = [
  { icon: 'i-tabler-notebook', key: 'point1' },
  { icon: 'i-tabler-camera', key: 'point2' },
  { icon: 'i-tabler-books', key: 'point3' }
]
</script>

<template>
  <section
    class="get-app card"
    aria-labelledby="get-app-h"
  >
    <div class="head">
      <span
        class="tile"
        aria-hidden="true"
      >
        <UIcon name="i-tabler-device-mobile" />
      </span>
      <div>
        <h2 id="get-app-h">
          {{ t('ai.web.title') }}
        </h2>
        <p class="text">
          {{ t('ai.web.text') }}
        </p>
      </div>
    </div>
    <ul class="points">
      <li
        v-for="p in POINTS"
        :key="p.key"
      >
        <UIcon
          :name="p.icon"
          class="point-icon"
        />
        <span>{{ t(`ai.web.${p.key}`) }}</span>
      </li>
    </ul>
    <p class="online">
      <UIcon
        name="i-tabler-wifi"
        class="online-icon"
      />
      {{ t('ai.web.online') }}
    </p>
    <div class="foot">
      <a
        :href="RELEASES"
        target="_blank"
        rel="noopener noreferrer"
        class="btn btn-primary btn-block"
      >
        <UIcon name="i-tabler-brand-android" /> {{ t('ai.web.download') }}
      </a>
      <p class="note">
        {{ t('ai.web.note') }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.get-app {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.head {
  display: flex;
  gap: 12px;
  padding: 16px 14px 14px;
}

.tile {
  flex: none;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-control);
  background: var(--accent-soft);
  color: var(--green);
  font-size: 24px;
}

h2 {
  margin: 2px 0 4px;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.text {
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: var(--text-2);
}

.points {
  margin: 0;
  padding: 0;
  list-style: none;
}

.points li {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-top: 1px solid var(--line);
  font-size: 14px;
  line-height: 1.45;
}

.point-icon {
  flex: none;
  margin-top: 1px;
  font-size: 20px;
  color: var(--green);
}

.online {
  display: flex;
  gap: 12px;
  margin: 0;
  padding: 12px 14px;
  border-top: 1px solid var(--line);
  background: var(--well);
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-2);
}

.online-icon {
  flex: none;
  margin-top: 1px;
  font-size: 18px;
  color: var(--text-3);
}

.foot {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-top: 1px solid var(--line);
}

.note {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-3);
}
</style>
