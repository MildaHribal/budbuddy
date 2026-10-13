<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()

// heavy routes (AI runtime, supabase-js) prefetch on interaction only, not as soon as the nav is visible
const items = [
  { to: '/', label: 'home', icon: 'home' },
  { to: '/plants', label: 'plants', icon: 'plants' },
  { to: '/ai-assistant', label: 'ai', icon: 'spark', heavy: true },
  { to: '/guide', label: 'guide', icon: 'guide' },
  { to: '/community', label: 'community', icon: 'community', heavy: true }
]

const COMMUNITY = ['/community', '/u/', '/plant/', '/strains', '/challenges']
const isActive = (to: string) => {
  if (to === '/') return route.path === '/'
  if (to === '/community') return COMMUNITY.some(p => route.path.startsWith(p))
  return route.path.startsWith(to)
}
</script>

<template>
  <nav
    class="bottom-nav"
    :aria-label="t('common.nav.main')"
  >
    <div class="nav-row">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        :prefetch-on="item.heavy ? 'interaction' : 'visibility'"
        class="nav-item"
        :class="{ active: isActive(item.to) }"
        :aria-current="isActive(item.to) ? 'page' : undefined"
      >
        <span class="nav-icon-wrap">
          <GrowIcon :name="item.icon" />
        </span>
        <span class="nav-label">{{ t(`common.nav.${item.label}`) }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  background: var(--bg);
  border-top: 1px solid var(--line);
}

.nav-row {
  display: flex;
  padding: 6px 8px calc(6px + var(--safe-bottom));
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 0 4px;
  color: var(--text-3);
  text-decoration: none;
  user-select: none;
  transition: color var(--dur) ease;
}

.nav-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 32px;
  border-radius: 16px;
  font-size: 24px;
  transition: background var(--dur) ease, transform var(--dur-fast) var(--ease-out);
}

.nav-item:active .nav-icon-wrap {
  transform: scale(0.9);
}

.nav-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.nav-item.active {
  color: var(--text);
}

.nav-item.active .nav-icon-wrap {
  background: var(--accent-soft);
  color: var(--green);
}
</style>
