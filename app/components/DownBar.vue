<script setup lang="ts">
import { ref } from 'vue'
const menuOpen = ref(false)
function toggleMenu() {
  menuOpen.value = !menuOpen.value
}
</script>

<template>
  <nav class="downbar" role="navigation" aria-label="Mobilní dolní menu">
    <div class="left-group">
      <NuxtLink to="/" class="item" aria-label="Deník">
        <UIcon name="lsicon:house-outline" class="size-7" />
      </NuxtLink>

      <NuxtLink to="/" class="item" aria-label="Hledat">
        <UIcon name="mdi:tree-outline" class="size-7" />
      </NuxtLink>
    </div>

    <NuxtLink to="/" class="center-btn" aria-label="Přidat" title="Přidat nový záznam">
      <UIcon name="iconamoon:scanner-light" class="size-7" />
    </NuxtLink>

    <div class="right-group">
      <NuxtLink to="/nutriens-calc" class="item" aria-label="Kalkulačka">
        <UIcon name="streamline-plump:gallery-2-solid" class="size-7" />
      </NuxtLink>

      <button class="hamburger" type="button" aria-label="Menu" @click="toggleMenu">
        <svg class="hamburger-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M3 6h18M3 12h18M3 18h18"></path>
        </svg>
      </button>
    </div>

    <!-- Simple menu sheet (minimal) -->
    <div v-if="menuOpen" class="menu-sheet" role="dialog" aria-modal="true">
      <ul>
        <li><NuxtLink to="/">Domů</NuxtLink></li>
        <li><NuxtLink to="/grow-diary">Deník</NuxtLink></li>
        <li><NuxtLink to="/nutriens-calc">Kalkulačka</NuxtLink></li>
      </ul>
    </div>
  </nav>
</template>

<style scoped>
.downbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: calc(60px + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px calc(8px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg,#04140c,#071a11);
  box-shadow: 0 -6px 18px rgba(0,0,0,0.6);
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  z-index: 1000;
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  touch-action: manipulation;
}

.left-group, .right-group {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 12px;
  flex: 1;
}

.item {
  color: #7bf2a4;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px;
  border-radius: 8px;
}

.item[aria-current="page"] {
  color: #00c46a;
}

.icon {
  width: 28px;
  height: 28px;
  display: block;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.hamburger-icon {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.center-icon {
  width: 28px;
  height: 28px;
  fill: none;
  stroke: white;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(0,0,0,0.06);
}

.center-btn {
  position: relative;
  top: -22px;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: linear-gradient(135deg,#00c46a,#006b2f);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(0,196,106,0.18), 0 2px 6px rgba(0,0,0,0.3);
  transform: translateZ(0);
  text-decoration: none;
  border: 3px solid rgba(0,0,0,0.35);
}

.center-btn svg { transform: translateY(1px); }

.hamburger {
  background: transparent !important;
  border: none !important;
  color: #7bf2a4 !important;
  width: 44px;
  height: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.hamburger svg { stroke: currentColor; }

.menu-sheet {
  position: fixed;
  bottom: calc(60px + env(safe-area-inset-bottom));
  right: 12px;
  background: #071a11;
  color: #e6fff0;
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  z-index: 1200;
}

.menu-sheet ul { list-style: none; margin: 0; padding: 0; }
.menu-sheet li { padding: 8px 0; }
.menu-sheet a { color: #bff8d2; text-decoration: none; }

@media (min-width: 768px) {
  .downbar { display: none; }
}

@media (max-width: 320px) {
  .center-btn { width: 52px; height: 52px; top: -20px; }
  .icon { width: 24px; height: 24px; }
}
</style>
