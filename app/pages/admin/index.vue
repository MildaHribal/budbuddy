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
      <div
        v-else-if="!isAdmin"
        class="locked"
      >
        <UIcon
          name="i-tabler-lock"
          class="locked-icon"
        />
        <p class="locked-title">
          {{ t('admin.notAllowed') }}
        </p>
        <p class="locked-text">
          {{ t('admin.notAllowedText') }}
        </p>
        <button
          v-if="!signedIn"
          type="button"
          class="btn btn-soft"
          @click="requireAuth()"
        >
          {{ t('admin.signIn') }}
        </button>
      </div>
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
.locked {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 28px 20px 30px;
  text-align: center;
  border-radius: var(--radius);
  box-shadow: inset 0 0 0 1px var(--line);
}

.locked-icon {
  margin-bottom: 8px;
  font-size: 48px;
  color: var(--text-3);
}

.locked-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.locked-text {
  margin: 0 0 10px;
  max-width: 30ch;
  color: var(--text-2);
  font-size: 13px;
  line-height: 1.5;
}

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
