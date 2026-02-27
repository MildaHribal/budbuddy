<template>
  <!-- Desktop: show phone frame -->
  <div v-if="isDesktop" class="phone-frame-backdrop">
    <div class="phone-device">
      <!-- Side buttons -->
      <div class="btn-silent"></div>
      <div class="btn-volume-up"></div>
      <div class="btn-volume-down"></div>
      <div class="btn-power"></div>

      <!-- Top speaker / dynamic island -->
      <div class="phone-notch">
        <div class="notch-pill"></div>
      </div>

      <!-- Screen area -->
      <div class="phone-screen">
        <slot />
      </div>

      <!-- Bottom home indicator -->
      <div class="phone-home-indicator">
        <div class="home-bar"></div>
      </div>
    </div>
  </div>

  <!-- Mobile: render content directly -->
  <slot v-else />
</template>

<script setup lang="ts">
import { useDeviceType } from '~/composables/useDeviceType'

const { isDesktop } = useDeviceType()
</script>

<style scoped>
/* ── Backdrop ──────────────────────────────── */
.phone-frame-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(123, 199, 77, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(90, 158, 58, 0.04) 0%, transparent 50%),
    linear-gradient(160deg, #0d0d0d 0%, #111111 40%, #0a0a0a 100%);
  overflow: hidden;
  z-index: 0;
}

/* Subtle grid pattern on backdrop */
.phone-frame-backdrop::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
}

/* ── Phone device ─────────────────────────── */
.phone-device {
  position: relative;
  width: 390px;
  height: 844px;
  max-height: 90vh;
  background: #000;
  border-radius: 52px;
  border: 10px solid #1a1a1a;
  box-shadow:
    /* Inner bezel highlight */
    inset 0 0 0 2px rgba(255, 255, 255, 0.08),
    /* Outer shadow layers */
    0 0 0 1px rgba(0, 0, 0, 0.8),
    0 20px 60px rgba(0, 0, 0, 0.6),
    0 8px 20px rgba(0, 0, 0, 0.4),
    /* Subtle green ambient glow */
    0 0 80px rgba(123, 199, 77, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ── Side buttons ─────────────────────────── */
.btn-silent {
  position: absolute;
  left: -13px;
  top: 120px;
  width: 3px;
  height: 28px;
  background: linear-gradient(180deg, #2a2a2a, #1a1a1a);
  border-radius: 2px 0 0 2px;
  box-shadow: -1px 0 2px rgba(0,0,0,0.5);
}

.btn-volume-up {
  position: absolute;
  left: -13px;
  top: 170px;
  width: 3px;
  height: 44px;
  background: linear-gradient(180deg, #2a2a2a, #1a1a1a);
  border-radius: 2px 0 0 2px;
  box-shadow: -1px 0 2px rgba(0,0,0,0.5);
}

.btn-volume-down {
  position: absolute;
  left: -13px;
  top: 224px;
  width: 3px;
  height: 44px;
  background: linear-gradient(180deg, #2a2a2a, #1a1a1a);
  border-radius: 2px 0 0 2px;
  box-shadow: -1px 0 2px rgba(0,0,0,0.5);
}

.btn-power {
  position: absolute;
  right: -13px;
  top: 190px;
  width: 3px;
  height: 64px;
  background: linear-gradient(180deg, #2a2a2a, #1a1a1a);
  border-radius: 0 2px 2px 0;
  box-shadow: 1px 0 2px rgba(0,0,0,0.5);
}

/* ── Top notch / Dynamic Island ──────────── */
.phone-notch {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  background: #000;
  position: relative;
  z-index: 10;
}

.notch-pill {
  width: 120px;
  height: 32px;
  background: #111;
  border-radius: 20px;
  box-shadow:
    inset 0 1px 3px rgba(0,0,0,0.6),
    0 1px 0 rgba(255,255,255,0.05);
  position: relative;
}

/* Camera dot */
.notch-pill::after {
  content: '';
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, #1a2a3a, #0a0a0f);
  box-shadow:
    inset 0 0 2px rgba(0,0,0,0.8),
    0 0 1px rgba(255,255,255,0.1);
}

/* ── Screen area ──────────────────────────── */
.phone-screen {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--app-bg, #0a0a0a);
  position: relative;

  /* Smooth scrollbar inside phone */
  scrollbar-width: none;
}

.phone-screen::-webkit-scrollbar {
  display: none;
}

/* ── Home indicator ───────────────────────── */
.phone-home-indicator {
  flex-shrink: 0;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  position: relative;
  z-index: 10;
}

.home-bar {
  width: 130px;
  height: 5px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 100px;
}

/* ── Responsive scaling for smaller desktops ── */
@media (max-height: 900px) {
  .phone-device {
    height: 780px;
    width: 360px;
    border-radius: 48px;
  }
}

@media (max-height: 750px) {
  .phone-device {
    height: 680px;
    width: 320px;
    border-radius: 44px;
  }
}
</style>
