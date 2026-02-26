<template>
  <div class="downbar">
    <!-- Frosted top border glow -->
    <div class="top-glow"></div>

    <nav class="nav-row">
      <!-- Home -->
      <NuxtLink to="/" class="nav-item" aria-label="Domů">
        <div class="nav-icon-wrap">
          <Icon icon="tabler:home-2" height="22" />
        </div>
        <span class="nav-label">Home</span>
        <div class="nav-dot"></div>
      </NuxtLink>

      <!-- My Plants -->
      <NuxtLink to="/my-trees" class="nav-item" aria-label="Rostliny">
        <div class="nav-icon-wrap">
          <Icon icon="tabler:leaf" height="22" />
        </div>
        <span class="nav-label">Plants</span>
        <div class="nav-dot"></div>
      </NuxtLink>

      <!-- AI – center elevated button -->
      <NuxtLink
        to="/ai-assistant"
        class="nav-item ai-btn"
        aria-label="AI Asistent"
      >
        <div class="ai-glow"></div>
        <div class="ai-ring"></div>
        <Icon icon="tabler:brain" height="26" />
      </NuxtLink>

      <!-- Gallery -->
      <NuxtLink to="/nutriens-calc" class="nav-item" aria-label="Galerie">
        <div class="nav-icon-wrap">
          <Icon icon="tabler:photo" height="22" />
        </div>
        <span class="nav-label">Gallery</span>
        <div class="nav-dot"></div>
      </NuxtLink>

      <!-- Stats -->
      <NuxtLink to="/stats" class="nav-item" aria-label="Statistiky">
        <div class="nav-icon-wrap">
          <Icon icon="tabler:chart-bar" height="22" />
        </div>
        <span class="nav-label">Stats</span>
        <div class="nav-dot"></div>
      </NuxtLink>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";
</script>

<style scoped>
/* ── Wrapper ─────────────────────────────── */
.downbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: rgba(12, 12, 12, 0.92);
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow:
    0 -1px 0 rgba(123, 199, 77, 0.08),
    0 -8px 40px rgba(0, 0, 0, 0.5);
}

/* ── Top glow line ───────────────────────── */
.top-glow {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(123, 199, 77, 0.5) 30%,
    rgba(159, 231, 109, 0.8) 50%,
    rgba(123, 199, 77, 0.5) 70%,
    transparent 100%
  );
}

/* ── Nav row ─────────────────────────────── */
.nav-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  padding: 10px 8px calc(10px + env(safe-area-inset-bottom));
  position: relative;
}

/* ── Nav item (regular) ──────────────────── */
.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  text-decoration: none;
  color: #4a4a4a;
  padding: 4px 0;
  position: relative;
  transition: color 0.25s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.nav-item:active {
  transform: scale(0.88);
}

.nav-icon-wrap {
  width: 44px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  transition: all 0.25s ease;
}

.nav-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  transition: color 0.25s ease;
}

/* Active dot indicator */
.nav-dot {
  position: absolute;
  bottom: -4px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #7bc74d;
  opacity: 0;
  transform: scale(0);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Active state */
.nav-item.router-link-active {
  color: #7bc74d;
}
.nav-item.router-link-active .nav-icon-wrap {
  background: rgba(123, 199, 77, 0.12);
  box-shadow: 0 2px 12px rgba(123, 199, 77, 0.15);
}
.nav-item.router-link-active .nav-dot {
  opacity: 1;
  transform: scale(1);
}

/* ── AI center button ────────────────────── */
.ai-btn {
  flex: 0 0 auto;
  position: relative;
  width: 60px;
  height: 60px;
  margin-bottom: 14px;
  background: linear-gradient(145deg, #8dd957 0%, #7bc74d 40%, #5a9e3a 100%);
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 6px 20px rgba(123, 199, 77, 0.45),
    0 2px 8px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: visible;
  gap: 0;
  padding: 0;
}

.ai-btn:active {
  transform: scale(0.88) translateY(2px);
  box-shadow:
    0 3px 12px rgba(123, 199, 77, 0.3),
    0 1px 4px rgba(0, 0, 0, 0.4);
}

/* Pulsing glow ring */
.ai-glow {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(123, 199, 77, 0.25) 0%,
    transparent 70%
  );
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

/* Inner shine ring */
.ai-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  pointer-events: none;
}

/* AI active state – always green, never gray */
.ai-btn.router-link-active {
  color: #fff;
  box-shadow:
    0 8px 28px rgba(123, 199, 77, 0.55),
    0 2px 10px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}
.ai-btn.router-link-active .nav-icon-wrap,
.ai-btn .nav-icon-wrap {
  display: none;
}
.ai-btn .nav-dot {
  display: none;
}
.ai-btn .nav-label {
  display: none;
}
</style>
