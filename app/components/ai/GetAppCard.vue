<script setup lang="ts">
const RELEASES = 'https://github.com/MildaHribal/budbuddy/releases/latest'
const { t } = useI18n()
</script>

<template>
  <div class="get-app card">
    <span class="tile">
      <UIcon name="i-tabler-device-mobile" />
    </span>
    <h2>{{ t('ai.web.title') }}</h2>
    <p>{{ t('ai.web.text') }}</p>
    <ul>
      <li>{{ t('ai.web.point1') }}</li>
      <li>{{ t('ai.web.point2') }}</li>
      <li>{{ t('ai.web.point3') }}</li>
    </ul>
    <a
      :href="RELEASES"
      target="_blank"
      rel="noopener noreferrer"
      class="btn btn-primary"
    >
      <UIcon name="i-tabler-brand-android" /> {{ t('ai.web.download') }}
    </a>
    <p class="note">
      {{ t('ai.web.note') }}
    </p>
  </div>
</template>

<style scoped>
.get-app {
  display: grid;
  gap: 12px;
  padding: 20px;
}

.tile {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: var(--radius);
  background: var(--accent-soft);
  color: var(--green);
  font-size: 28px;
}

h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

p {
  margin: 0;
  color: var(--text-2);
  line-height: 1.5;
}

ul {
  margin: 0;
  padding-left: 18px;
  list-style: disc;
  color: var(--text-2);
  line-height: 1.6;
}

.btn {
  justify-self: start;
}

.note {
  color: var(--text-3);
  font-size: 13px;
}
</style>
