<script setup lang="ts">
const { profile } = useAuth()
const { t } = useI18n()
</script>

<template>
  <NuxtLink
    v-if="profile?.is_admin"
    to="/admin"
    class="icon-btn admin-link"
    :aria-label="t('admin.link')"
    :title="t('admin.link')"
  >
    <UIcon name="i-tabler-shield-half-filled" />
  </NuxtLink>
</template>

<style scoped>
.admin-link {
  color: var(--leaf);
  text-decoration: none;
}
</style>
