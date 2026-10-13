<script setup lang="ts">
const props = withDefaults(defineProps<{ url?: string | null, name?: string | null, size?: number }>(), { url: null, name: null, size: 40 })
const initial = computed(() => (props.name?.trim().charAt(0) || '?').toUpperCase())
</script>

<template>
  <span
    class="avatar"
    :style="{ width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.42)}px` }"
  >
    <img
      v-if="url"
      :src="url"
      alt=""
      loading="lazy"
      referrerpolicy="no-referrer"
    >
    <span v-else>{{ initial }}</span>
  </span>
</template>

<style scoped>
.avatar {
  flex-shrink: 0;
  display: inline-grid;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  background: var(--surface-3);
  color: var(--text-2);
  font-weight: 600;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
