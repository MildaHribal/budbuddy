<template>
  <div class="plant-info-card">
    <div class="card-header">
      <div class="plant-avatar">
        <img
          v-if="imageUrl"
          :src="imageUrl"
          :alt="name"
        >
        <Icon
          v-else
          icon="tabler:plant"
          height="32"
          style="color: #7bc74d"
        />
      </div>

      <div class="plant-details">
        <h3 class="plant-name">
          {{ name }}
        </h3>
        <div class="plant-meta">
          <span class="meta-item">
            <Icon
              icon="tabler:calendar"
              height="14"
            />
            Den {{ currentDay }}
          </span>
          <span class="meta-divider">•</span>
          <span class="meta-item">
            <Icon
              :icon="stageIcon"
              height="14"
            />
            {{ stage }}
          </span>
        </div>
      </div>

      <button class="options-btn">
        <Icon
          icon="tabler:dots-vertical"
          height="20"
        />
      </button>
    </div>

    <div class="card-stats">
      <div class="stat-item">
        <Icon
          icon="tabler:heart-filled"
          height="18"
          :style="{ color: healthColor }"
        />
        <div class="stat-info">
          <div class="stat-label">
            Zdraví
          </div>
          <div class="stat-value">
            {{ health }}%
          </div>
        </div>
      </div>

      <div class="stat-item">
        <Icon
          icon="tabler:ruler"
          height="18"
          style="color: #7bc74d"
        />
        <div class="stat-info">
          <div class="stat-label">
            Výška
          </div>
          <div class="stat-value">
            {{ height }} cm
          </div>
        </div>
      </div>

      <div class="stat-item">
        <Icon
          icon="tabler:droplet"
          height="18"
          style="color: #4a9eff"
        />
        <div class="stat-info">
          <div class="stat-label">
            Vlhkost
          </div>
          <div class="stat-value">
            {{ moisture }}%
          </div>
        </div>
      </div>
    </div>

    <div class="progress-section">
      <div class="progress-header">
        <span class="progress-label">Pokrok fáze</span>
        <span class="progress-percentage">{{ stageProgress }}%</span>
      </div>
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: stageProgress + '%' }"
        />
      </div>
      <div class="progress-footer">
        <span>{{ currentDay }} dní</span>
        <span>{{ remainingDays }} dní zbývá</span>
      </div>
    </div>

    <div class="quick-actions">
      <button class="action-btn water">
        <Icon
          icon="tabler:droplet-filled"
          height="20"
        />
        <span>Zalít</span>
      </button>
      <button class="action-btn feed">
        <Icon
          icon="tabler:flask-2-filled"
          height="20"
        />
        <span>Přidat živiny</span>
      </button>
      <button class="action-btn note">
        <Icon
          icon="tabler:notes"
          height="20"
        />
        <span>Poznámka</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

const props = defineProps<{
  name: string
  stage: string
  stageIcon: string
  currentDay: number
  totalDays: number
  health: number
  height: number
  moisture: number
  imageUrl?: string
}>()

const stageProgress = computed(() => {
  return Math.min(Math.round((props.currentDay / props.totalDays) * 100), 100)
})

const remainingDays = computed(() => {
  return Math.max(props.totalDays - props.currentDay, 0)
})

const healthColor = computed(() => {
  if (props.health >= 80) return '#7bc74d'
  if (props.health >= 60) return '#ffaa00'
  return '#ff4444'
})
</script>

<style scoped>
.plant-info-card {
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%);
  border: 1px solid rgba(123, 199, 77, 0.2);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.plant-avatar {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: rgba(123, 199, 77, 0.15);
  border: 2px solid rgba(123, 199, 77, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.plant-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.plant-details {
  flex: 1;
  min-width: 0;
}

.plant-name {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 6px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plant-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #999;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-divider {
  color: #666;
}

.options-btn {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(123, 199, 77, 0.1);
  border: 1px solid rgba(123, 199, 77, 0.2);
  color: #7bc74d;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.options-btn:active {
  transform: scale(0.95);
  background: rgba(123, 199, 77, 0.2);
}

.card-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(123, 199, 77, 0.1);
  border-radius: 12px;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: 10px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 2px;
}

.stat-value {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
}

.progress-section {
  margin-bottom: 20px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.progress-label {
  font-size: 13px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.progress-percentage {
  font-size: 16px;
  font-weight: 700;
  color: #7bc74d;
}

.progress-bar {
  height: 10px;
  background: rgba(123, 199, 77, 0.1);
  border-radius: 100px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #5a9e3a 0%, #7bc74d 50%, #9fe76d 100%);
  border-radius: 100px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 12px rgba(123, 199, 77, 0.5);
}

.progress-footer {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(123, 199, 77, 0.15);
  border-radius: 12px;
  color: #7bc74d;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.action-btn:active {
  transform: scale(0.95);
  background: rgba(123, 199, 77, 0.1);
  border-color: rgba(123, 199, 77, 0.3);
}

.action-btn.water {
  color: #4a9eff;
}

.action-btn.feed {
  color: #ff9d00;
}
</style>
