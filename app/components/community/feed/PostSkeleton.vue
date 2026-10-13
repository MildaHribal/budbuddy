<script setup lang="ts">
defineProps<{ photo?: boolean }>()
</script>

<template>
  <div
    class="skel card"
    aria-hidden="true"
  >
    <div class="row">
      <span class="sk circle" />
      <span class="col">
        <span
          class="sk line"
          style="width: 42%"
        />
        <span
          class="sk line sm"
          style="width: 28%"
        />
      </span>
    </div>
    <span
      class="sk line lg"
      style="width: 78%"
    />
    <span class="sk line" />
    <span
      class="sk line"
      style="width: 64%"
    />
    <span
      v-if="photo"
      class="sk photo"
    />
  </div>
</template>

<style scoped>
.skel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sk {
  display: block;
  border-radius: 6px;
  background: var(--surface-3);
  animation: pulse 1.4s ease-in-out infinite;
}

.circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.line {
  height: 12px;
}

.line.sm {
  height: 10px;
}

.line.lg {
  height: 16px;
}

.photo {
  aspect-ratio: 4 / 3;
  border-radius: 12px;
}

@keyframes pulse {
  50% {
    opacity: 0.5;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sk {
    animation: none;
  }
}
</style>
