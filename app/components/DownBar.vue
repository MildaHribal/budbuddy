<template>
  <div class="downbar">
    <div class="downbar-background"></div>
    <div class="row">
      <NuxtLink to="/" class="btn">
        <Icon icon="tabler:home" height="26" />
      </NuxtLink>

      <NuxtLink to="/my-trees" class="btn">
        <Icon icon="tabler:leaf" height="26" />
      </NuxtLink>

      <NuxtLink to="/" class="btn center-btn" aria-label="Scan">
        <Icon icon="tabler:line-scan" height="26" />
      </NuxtLink>

      <NuxtLink to="/nutriens-calc" class="btn">
        <Icon icon="solar:calculator-broken" height="26" />
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { homeOutline, leafOutline, addCircleOutline, calculatorOutline, menuOutline } from 'ionicons/icons'
import { Icon } from "@iconify/vue";

const icons = {
  homeOutline,
  leafOutline,
  addCircleOutline,
  calculatorOutline,
  menuOutline
}
</script>

<style scoped>
.downbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(180deg, #1a1a1a 0%, #0f0f0f 100%);
  border-top: 1px solid rgba(123, 199, 77, 0.1);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
}

.downbar-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #7bc74d 50%, transparent 100%);
  opacity: 0.3;
}

.row {
  display: flex;
  gap: 4px;
  align-items: center;
  justify-content: space-around;
  padding: calc(10px + var(--ion-safe-area-bottom)) 16px 10px 16px;
  position: relative;
}

.btn {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #888;
  padding: 10px;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  background: transparent;
}

.btn::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  background: rgba(123, 199, 77, 0);
  transition: all 0.3s ease;
}

.btn:hover::before,
.btn.router-link-active::before {
  background: rgba(123, 199, 77, 0.1);
}

.btn:hover {
  color: #7bc74d;
  transform: translateY(-2px);
}

.btn.router-link-active {
  color: #7bc74d;
}

.btn:active {
  transform: translateY(0);
}

.center-btn {
  flex: 0 0 auto;
  margin: 0 8px;
}
</style>

<style>
body.downbar-hidden .downbar-ionic {
  transform: translateY(100%);
  transition: transform 0.18s ease;
  pointer-events: none;
  opacity: 0;
}

</style>
