<template>
  <div class="downbar">
    <div class="downbar-background"></div>
    <div class="row">
      <NuxtLink to="/home" class="btn">
        <Icon icon="tabler:home" height="24" />
        <span class="btn-label">Domů</span>
      </NuxtLink>

      <NuxtLink to="/my-trees" class="btn">
        <Icon icon="tabler:leaf" height="24" />
        <span class="btn-label">Rostliny</span>
      </NuxtLink>

      <NuxtLink to="/ai-assistant" class="btn center-btn" aria-label="AI Asistent">
        <div class="center-btn-glow"></div>
        <Icon icon="tabler:brain" height="28" />
      </NuxtLink>

      <NuxtLink to="/nutriens-calc" class="btn">
        <Icon icon="solar:calculator-broken" height="24" />
        <span class="btn-label">Kalkulačka</span>
      </NuxtLink>

      <NuxtLink to="/" class="btn">
        <Icon icon="tabler:calendar" height="24" />
        <span class="btn-label">Deník</span>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";
</script>

<style scoped>
.downbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: linear-gradient(180deg, rgba(26, 26, 26, 0.98) 0%, rgba(15, 15, 15, 0.98) 100%);
  border-top: 1px solid rgba(123, 199, 77, 0.15);
  box-shadow: 0 -4px 30px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(20px);
}

.downbar-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, #7bc74d 30%, #9fe76d 50%, #7bc74d 70%, transparent 100%);
  opacity: 0.4;
}

.row {
  display: flex;
  gap: 2px;
  align-items: flex-end;
  justify-content: space-around;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom)) 12px;
  position: relative;
}

.btn {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #666;
  padding: 8px 4px;
  border-radius: 14px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  background: transparent;
  gap: 4px;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.btn-label {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.02em;
  margin-top: 2px;
  transition: all 0.25s ease;
}

.btn::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 14px;
  background: rgba(123, 199, 77, 0);
  transition: all 0.25s ease;
}

.btn.router-link-active {
  color: #7bc74d;
}

.btn.router-link-active::before {
  background: rgba(123, 199, 77, 0.12);
}

.btn:active {
  transform: scale(0.92);
}

.center-btn {
  flex: 0 0 auto;
  margin: 0 4px;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #7bc74d 0%, #5a9e3a 100%);
  width: 64px;
  height: 64px;
  border-radius: 50%;
  color: #fff;
  box-shadow: 0 6px 24px rgba(123, 199, 77, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: visible;
}

.center-btn-glow {
  position: absolute;
  inset: -4px;
  background: radial-gradient(circle, rgba(123, 199, 77, 0.3) 0%, transparent 70%);
  border-radius: 50%;
  z-index: -1;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

.center-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%);
  pointer-events: none;
}

.center-btn:active {
  transform: scale(0.88);
  box-shadow: 0 4px 16px rgba(123, 199, 77, 0.3), 0 2px 6px rgba(0, 0, 0, 0.3);
}

.center-btn .btn-label {
  display: none;
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
