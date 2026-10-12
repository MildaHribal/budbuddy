<script setup lang="ts">
const { t } = useI18n()
useHead({ title: () => t('common.notFound.title') })
</script>

<template>
  <div>
    <AppHeader
      :title="t('common.notFound.title')"
      back
    />
    <div class="page">
      <EmptyState
        icon="seedling"
        :title="t('common.notFound.title')"
        :text="t('common.notFound.text')"
      >
        <NuxtLink
          to="/"
          replace
          class="btn btn-soft"
        >
          {{ t('common.notFound.home') }}
        </NuxtLink>
      </EmptyState>
    </div>
  </div>
</template>
