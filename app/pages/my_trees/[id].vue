<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router';
import { computed, ref, onMounted } from 'vue';
import { Icon } from "@iconify/vue";
import { usePlants } from '~/composables/usePlants';
import DayPicker from '~/components/trees/DayPicker.vue';
import Actions from '~/components/trees/journal/Actions.vue';
import ActionBar from "~/components/trees/ActionBar.vue";

const route = useRoute();
const router = useRouter();
const { plants, loadPlantsFromStorage } = usePlants();

const selectedDate = ref(new Date().toISOString().slice(0,10));

onMounted(() => {
  loadPlantsFromStorage();
});

const plantId = route.params.id;

const plant = computed(() => {
  if (!plantId) return null;
  return plants.value.find(p => String(p.id) === String(plantId)) || null;
});

function handleDateUpdate(newDate: string) {
  selectedDate.value = newDate;
}

const goBack = () => {
  router.push('/my-trees');
};

const getStageInfo = (stage: string) => {
  const stages: Record<string, { icon: string; color: string; label: string }> = {
    'Germination': { icon: 'tabler:seeding', color: '#9fe76d', label: 'Germination' },
    'Seedling': { icon: 'tabler:plant', color: '#7bc74d', label: 'Seedling' },
    'Vegetative': { icon: 'tabler:tree', color: '#5a9e3a', label: 'Vegetative' },
    'Flowering': { icon: 'tabler:flower', color: '#7bc74d', label: 'Flowering' }
  };
  return stages[stage] ?? stages['Seedling'];
};
</script>

<template>
  <div class="plant-detail-page">
    <!-- Header -->
    <div class="detail-header">
      <button @click="goBack" class="back-button">
        <Icon icon="tabler:arrow-left" :height="24" />
      </button>
      <h1 class="header-title">{{ plant?.name || 'Plant Details' }}</h1>
      <div class="header-spacer"></div>
    </div>

    <!-- Loading state -->
    <div v-if="!plant && plants.length === 0" class="loading-state">
      <Icon icon="tabler:loader-2" :height="48" class="loading-spinner" />
      <p>Loading plant data...</p>
    </div>

    <!-- Not found state -->
    <div v-else-if="!plant" class="not-found-state">
      <Icon icon="tabler:plant-off" :height="64" style="color: #666" />
      <h2>Plant not found</h2>
      <p>ID: {{ plantId }}</p>
      <button @click="goBack" class="btn-accent">
        <Icon icon="tabler:arrow-left" :height="20" />
        <span>Go Back</span>
      </button>
    </div>

    <!-- Plant content -->
    <div v-else class="plant-content">
      <!-- Plant image -->
      <div class="plant-image-container">
        <img
          v-if="plant.photoPreview"
          :src="plant.photoPreview"
          :alt="plant.name"
          class="plant-image"
        />
        <div v-else class="plant-image-placeholder">
          <Icon icon="tabler:plant" :height="80" />
          <span>No image</span>
        </div>

        <!-- Stage badge -->
        <template v-if="plant && (plant as any).stage">
          <div class="stage-badge" :style="{ borderColor: getStageInfo((plant! as any).stage || 'Seedling')!.color }">
            <Icon :icon="getStageInfo((plant! as any).stage || 'Seedling')!.icon" :height="18" />
            <span>{{ getStageInfo((plant! as any).stage || 'Seedling')!.label }}</span>
          </div>
        </template>
      </div>

      <!-- Plant info -->
      <div class="plant-info-section">
        <div class="info-card">
          <div class="info-row">
            <div class="info-label">
              <Icon icon="tabler:plant" :height="18" />
              <span>Strain</span>
            </div>
            <div class="info-value">{{ plant.strain || 'Unknown' }}</div>
          </div>

          <div v-if="(plant as any).potSize" class="info-row">
            <div class="info-label">
              <Icon icon="tabler:bucket" :height="18" />
              <span>Pot Size</span>
            </div>
            <div class="info-value">{{ (plant as any).potSize }}</div>
          </div>

          <div v-if="(plant as any).location" class="info-row">
            <div class="info-label">
              <Icon icon="tabler:home" :height="18" />
              <span>Location</span>
            </div>
            <div class="info-value">{{ (plant as any).location }}</div>
          </div>

          <div v-if="(plant as any).medium" class="info-row">
            <div class="info-label">
              <Icon icon="tabler:droplet" :height="18" />
              <span>Medium</span>
            </div>
            <div class="info-value">{{ (plant as any).medium }}</div>
          </div>
        </div>
      </div>

      <!-- Calendar & Actions -->
      <div class="journal-section">
        <h2 class="section-title">
          <Icon icon="tabler:calendar" :height="24" />
          <span>Journal</span>
        </h2>

        <DayPicker @update:date="handleDateUpdate" />
        <ActionBar :date="selectedDate" />
        <Actions :date="selectedDate" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.plant-detail-page {
  width: 100%;
  min-height: 100vh;
  background: #0a0a0a;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: max(env(safe-area-inset-top), 16px) 16px 16px;
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(20, 20, 20, 0.9) 100%);
  border-bottom: 1px solid rgba(123, 199, 77, 0.15);
  backdrop-filter: blur(10px);
}

.back-button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
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

.back-button:active {
  transform: scale(0.95);
  background: rgba(123, 199, 77, 0.2);
}

.header-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  margin: 0;
  flex: 1;
  text-align: center;
}

.header-spacer {
  width: 44px;
}

.loading-state,
.not-found-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
  min-height: 60vh;
}

.loading-spinner {
  color: #7bc74d;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-state p,
.not-found-state p {
  font-size: 15px;
  color: #999;
  margin: 16px 0 0 0;
}

.not-found-state h2 {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin: 16px 0 8px 0;
}

.not-found-state .btn-accent {
  margin-top: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.plant-content {
  padding: 0;
}

.plant-image-container {
  position: relative;
  width: 100%;
  height: 280px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(20, 20, 20, 0.9) 100%);
}

.plant-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.plant-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #666;
  font-size: 15px;
  font-weight: 600;
}

.stage-badge {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  border: 2px solid;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.plant-info-section {
  padding: 20px 16px;
}

.info-card {
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(20, 20, 20, 0.9) 100%);
  border: 1px solid rgba(123, 199, 77, 0.15);
  border-radius: 18px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #999;
  font-size: 14px;
  font-weight: 600;
}

.info-value {
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  text-transform: capitalize;
}

.journal-section {
  padding: 0 16px 24px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 16px;
}
</style>

