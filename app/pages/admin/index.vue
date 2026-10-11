<script setup lang="ts">
const { t } = useI18n()
useHead({ title: () => t('admin.title') })

const { profile, ready, signedIn, requireAuth } = useAuth()
const isAdmin = computed(() => profile.value?.is_admin === true)

const TABS = ['reports', 'hidden', 'strains', 'challenges', 'users'] as const
type Tab = typeof TABS[number]
const route = useRoute()
const router = useRouter()
const tab = ref<Tab>(TABS.includes(route.query.tab as Tab) ? route.query.tab as Tab : 'reports')
watch(tab, v => router.replace({ query: { ...route.query, tab: v } }))
</script>

<template>
  <div class="admin-page">
    <AppHeader
      :title="t('admin.title')"
      :subtitle="t('admin.subtitle')"
      back
    />
    <div class="page">
      <div
        v-if="!ready"
        class="sk"
      />
      <EmptyState
        v-else-if="!isAdmin"
        icon="community"
        :title="t('admin.notAllowed')"
        :text="t('admin.notAllowedText')"
      >
        <button
          v-if="!signedIn"
          type="button"
          class="btn btn-soft"
          @click="requireAuth()"
        >
          {{ t('admin.signIn') }}
        </button>
      </EmptyState>
      <template v-else>
        <div
          class="chips tabs"
          role="tablist"
        >
          <button
            v-for="k in TABS"
            :key="k"
            type="button"
            role="tab"
            class="chip"
            :aria-selected="tab === k"
            :aria-pressed="tab === k"
            @click="tab = k"
          >
            {{ t(`admin.tabs.${k}`) }}
          </button>
        </div>
        <div role="tabpanel">
          <KeepAlive>
            <AdminReports v-if="tab === 'reports'" />
            <AdminHidden v-else-if="tab === 'hidden'" />
            <AdminStrains v-else-if="tab === 'strains'" />
            <AdminChallenges v-else-if="tab === 'challenges'" />
            <AdminUsers v-else />
          </KeepAlive>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.tabs {
  margin: 0 -20px;
  padding: 0 20px 2px;
}
</style>

<style>
/* shared by the admin tab components */
.admin-page .stack {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.admin-page .sk {
  height: 150px;
  border-radius: var(--radius);
  background: linear-gradient(100deg, var(--surface) 30%, var(--surface-3) 50%, var(--surface) 70%);
  background-size: 300% 100%;
  animation: admin-shimmer 1.4s ease-in-out infinite;
}

@keyframes admin-shimmer {
  from { background-position: 100% 0; }
  to { background-position: 0 0; }
}

.admin-page .error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  text-align: center;
}

.admin-page .list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.admin-page .item {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  transition: opacity var(--dur) ease;
}

.admin-page .item.busy {
  opacity: 0.6;
}

.admin-page .actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.admin-page .actions .btn {
  min-height: 44px;
  padding: 0 14px;
  font-size: 13px;
}

@media (prefers-reduced-motion: reduce) {
  .admin-page .sk { animation: none; }
}
</style>
