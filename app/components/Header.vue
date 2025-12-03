<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <div class="header-wrapper">
    <div class="header-background"></div>
    <div class="header-content">
      <div class="header-icon">
        <span class="icon-emoji">🌳</span>
      </div>
      <h1 class="header-title">{{ title }}</h1>
    </div>
  </div>
</template>

<style scoped>
.header-wrapper {
  position: relative;
  padding: 1rem 0.75rem 1.25rem;
  margin-bottom: 1.5rem;
  overflow: hidden;
}

.header-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #7bc74d 0%, #5a9e3a 100%);
  opacity: 0.1;
  border-radius: 0 0 24px 24px;
}

.header-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 1;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: #3a5c25;
  border-radius: 16px;
  transition: transform 0.2s ease;
}

.header-icon:hover {
  transform: scale(1.05);
}

.icon-emoji {
  font-size: 24px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.header-title {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  background: #d1d1d1;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: -0.02em;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

@media (max-width: 640px) {
  .header-title {
    font-size: 1.75rem;
  }

  .header-icon {
    width: 44px;
    height: 44px;
  }

  .icon-emoji {
    font-size: 22px;
  }
}
</style>
