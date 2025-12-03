<template>
  <div class="splash-screen">
    <div class="splash-content">
      <div class="logo-container">
        <div class="logo-circle">
          <Icon icon="tabler:leaf" height="80" />
        </div>
        <div class="logo-glow"></div>
      </div>

      <h1 class="app-name">BudBuddy</h1>
      <p class="app-tagline">Tvůj pěstitelský asistent</p>

      <div class="loading-bar">
        <div class="loading-bar-fill"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { onMounted } from 'vue';

onMounted(() => {
  // Po 2 sekundách skrýt splash screen
  setTimeout(() => {
    const splash = document.querySelector('.splash-screen');
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => {
        splash.remove();
      }, 500);
    }
  }, 2000);
});
</script>

<style scoped>
.splash-screen {
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.5s ease;
}

.splash-screen.fade-out {
  animation: fadeOut 0.5s ease forwards;
}

.splash-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 40px;
  animation: slideUp 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.logo-container {
  position: relative;
  width: 140px;
  height: 140px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-circle {
  position: relative;
  z-index: 2;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7bc74d 0%, #5a9e3a 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  box-shadow: 0 8px 32px rgba(123, 199, 77, 0.4);
  animation: float 3s ease-in-out infinite;
}

.logo-glow {
  position: absolute;
  inset: -20px;
  background: radial-gradient(circle, rgba(123, 199, 77, 0.4) 0%, transparent 70%);
  border-radius: 50%;
  z-index: 1;
  animation: pulse 2s ease-in-out infinite;
}

.app-name {
  font-size: 48px;
  font-weight: 900;
  background: linear-gradient(135deg, #7bc74d 0%, #9fe76d 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
  margin: 0;
  animation: slideUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.2s backwards;
}

.app-tagline {
  font-size: 16px;
  color: #999;
  font-weight: 500;
  margin: 0;
  letter-spacing: 0.05em;
  animation: slideUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.3s backwards;
}

.loading-bar {
  width: 200px;
  height: 4px;
  background: rgba(123, 199, 77, 0.2);
  border-radius: 100px;
  overflow: hidden;
  margin-top: 20px;
  animation: slideUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) 0.4s backwards;
}

.loading-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #7bc74d 0%, #9fe76d 100%);
  border-radius: 100px;
  animation: loading 1.5s ease-in-out infinite;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeOut {
  to {
    opacity: 0;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  25% {
    transform: translateY(-10px) rotate(5deg);
  }
  50% {
    transform: translateY(0) rotate(0deg);
  }
  75% {
    transform: translateY(-10px) rotate(-5deg);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.4;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

@keyframes loading {
  0% {
    width: 0%;
    margin-left: 0%;
  }
  50% {
    width: 60%;
    margin-left: 20%;
  }
  100% {
    width: 0%;
    margin-left: 100%;
  }
}
</style>

