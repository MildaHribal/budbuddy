<script setup lang="ts">
const route = useRoute()

const items = [
  { to: '/', label: 'Home', icon: 'i-tabler-home-2' },
  { to: '/plants', label: 'Plants', icon: 'i-tabler-leaf' },
  { to: '/ai-assistant', label: 'AI', icon: 'i-tabler-brain', center: true },
  { to: '/gallery', label: 'Gallery', icon: 'i-tabler-photo' },
  { to: '/tools', label: 'Tools', icon: 'i-tabler-calculator' }
]

const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))
</script>

<template>
  <nav
    class="bottom-nav"
    aria-label="Main"
  >
    <div class="top-glow" />
    <div class="nav-row">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :class="{ active: isActive(item.to), center: item.center }"
        :aria-label="item.center ? 'AI assistant' : undefined"
        :aria-current="isActive(item.to) ? 'page' : undefined"
      >
        <template v-if="item.center">
          <span class="ai-glow" />
          <UIcon
            :name="item.icon"
            class="size-7"
          />
        </template>
        <template v-else>
          <span class="nav-icon-wrap">
            <UIcon
              :name="item.icon"
              class="size-[22px]"
            />
          </span>
          <span class="nav-label">{{ item.label }}</span>
        </template>
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
  background: rgba(12, 13, 12, 0.92);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.top-glow {
  position: absolute;
  top: 0;
  left: 20%;
  right: 20%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(159, 231, 109, 0.7), transparent);
}

.nav-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  padding: 8px 6px calc(10px + var(--safe-bottom));
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 2px 0;
  color: var(--text-3);
  text-decoration: none;
  user-select: none;
  transition: color 0.2s ease, transform 0.15s ease;
}

.nav-item:active {
  transform: scale(0.9);
}

.nav-icon-wrap {
  width: 48px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  transition: background 0.2s ease;
}

.nav-label {
  font-size: 11px;
  font-weight: 600;
}

.nav-item.active {
  color: var(--accent);
}

.nav-item.active .nav-icon-wrap {
  background: var(--accent-soft);
}

.nav-item.center {
  flex: 0 0 auto;
  position: relative;
  width: 58px;
  height: 58px;
  margin: 0 4px 10px;
  border-radius: 50%;
  justify-content: center;
  color: #fff;
  background: linear-gradient(145deg, #8dd957 0%, #7bc74d 45%, #5a9e3a 100%);
  box-shadow:
    0 6px 20px rgba(123, 199, 77, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.nav-item.center.active {
  color: #fff;
  box-shadow:
    0 0 0 3px rgba(123, 199, 77, 0.35),
    0 6px 24px rgba(123, 199, 77, 0.5);
}

.ai-glow {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(123, 199, 77, 0.25) 0%, transparent 70%);
  animation: ai-pulse 2.5s ease-in-out infinite;
  pointer-events: none;
}

@keyframes ai-pulse {
  0%,
  100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.12);
  }
}
</style>
