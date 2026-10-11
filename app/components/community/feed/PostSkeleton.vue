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
  padding: 16px;
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
  background: linear-gradient(110deg, #1b1f24 30%, #252a30 50%, #1b1f24 70%) 0 0 / 300% 100%;
  animation: shimmer 1.4s linear infinite;
}

.circle {
  width: 40px;
  height: 40px;
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
  border-radius: 14px;
}

@keyframes shimmer {
  to {
    background-position: -300% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sk {
    animation: none;
  }
}
</style>
