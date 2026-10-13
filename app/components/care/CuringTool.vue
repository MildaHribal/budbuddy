<script setup lang="ts">
// Tools → Drying & curing: every plant that is drying or curing, one card each.
const { t } = useI18n()
const grow = useGrow()

const plants = computed(() => grow.state.plants.filter(p => !p.archived && (p.stage === 'drying' || p.stage === 'curing')))
</script>

<template>
  <EmptyState
    v-if="!plants.length"
    icon="curing"
    :title="t('care.tool.curingEmptyTitle')"
    :text="t('care.tool.curingEmptyText')"
  />
  <section
    v-for="p in plants"
    :key="p.id"
  >
    <div class="section-head">
      <h2 class="section-title">
        {{ p.name }}
      </h2>
      <NuxtLink
        :to="`/plants/${p.id}`"
        class="link"
      >
        {{ t('care.tool.openPlant') }}
      </NuxtLink>
    </div>
    <CareDryingCard
      v-if="p.stage === 'drying'"
      :plant="p"
    />
    <CareCuringCard
      v-else
      :plant="p"
    />
  </section>
</template>
