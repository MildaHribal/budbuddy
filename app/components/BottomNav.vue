<script setup lang="ts">
const route = useRoute()
const { t } = useI18n()

const items = [
  { to: '/', label: 'home', icon: 'home' },
  { to: '/plants', label: 'plants', icon: 'plants' },
  { to: '/ai-assistant', label: 'ai', icon: 'spark', center: true },
  { to: '/guide', label: 'guide', icon: 'guide' },
  { to: '/tools', label: 'tools', icon: 'tools' }
]

const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
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
        class="nav-item"
        :class="{ active: isActive(item.to), center: item.center }"
        :aria-current="isActive(item.to) ? 'page' : undefined"
      >
        <span class="nav-icon-wrap">
          <GrowIcon
            :name="item.icon"
            :glow="isActive(item.to)"
          />
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
  background: linear-gradient(180deg, rgba(13, 15, 18, 0.88), rgba(7, 8, 10, 0.98));
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-top: 1px solid var(--line);
}

.nav-row {
  display: flex;
  justify-content: space-around;
  padding: 8px 8px calc(8px + var(--safe-bottom));
}

.nav-item {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 0 2px;
  color: var(--text-3);
  text-decoration: none;
  user-select: none;
  transition: color var(--dur) ease;
}

.nav-item::before {
  content: "";
  position: absolute;
  top: -9px;
  left: 50%;
  width: 26px;
  height: 2px;
  margin-left: -13px;
  border-radius: 2px;
  background: var(--leaf);
  box-shadow: 0 0 12px 2px rgba(155, 227, 107, 0.55);
  opacity: 0;
  transform: scaleX(0.2);
  transition: opacity var(--dur) ease, transform var(--dur-slow) var(--ease-out);
}

.nav-icon-wrap {
  display: flex;
  font-size: 24px;
  transition: transform var(--dur-fast) var(--ease-out);
}

.nav-item:active .nav-icon-wrap {
  transform: scale(0.86);
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.nav-item.active {
  color: var(--leaf);
}

.nav-item.active::before {
  opacity: 1;
  transform: scaleX(1);
}

.nav-item.center.active {
  color: var(--lamp);
}

.nav-item.center::before {
  background: var(--lamp);
  box-shadow: 0 0 12px 2px rgba(255, 210, 138, 0.55);
}
</style>
