<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { usePlants } from '~/composables/usePlants';
import { Icon } from "@iconify/vue";
import AddTreeModal from '~/components/trees/journal/AddTreeModal.vue';
import { useHead } from "#imports";

useHead({ title: 'My Plants' });

const { plants, loadPlantsFromStorage } = usePlants();
const isAddModalOpen = ref(false);

function onPlantsUpdatedHandler() {
  loadPlantsFromStorage();
}

onMounted(() => {
  loadPlantsFromStorage();
  if (typeof window !== 'undefined') {
    window.addEventListener('plants-updated', onPlantsUpdatedHandler);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('plants-updated', onPlantsUpdatedHandler);
  }
});

const showAddModal = () => {
  isAddModalOpen.value = true;
};

const closeAddModal = () => {
  isAddModalOpen.value = false;
  loadPlantsFromStorage();
};

function getDaysSince(plant: any): number {
  const dateStr = plant.plantingDate || plant.createdAt;
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}
</script>

<template>
  <div class="my-trees-page">
    <Header title="My Plants" icon="tabler:leaf" />

    <!-- Empty state -->
    <div v-if="plants.length === 0" class="empty-state">
      <div class="empty-icon">
        <Icon icon="tabler:plant-off" :height="80" />
      </div>
      <h2>No plants yet</h2>
      <p>Click the + button to add your first plant</p>
    </div>

    <!-- Plants list -->
    <div v-else class="plants-container">
      <div class="plants-grid">
        <NuxtLink
          v-for="plant in plants"
          :key="plant.id"
          :to="`/my_trees/${plant.id}`"
          class="plant-card"
        >
          <div class="plant-image">
            <img
              v-if="plant.photoPreview"
              :src="plant.photoPreview"
              :alt="plant.name"
            />
            <div v-else class="plant-placeholder">
              <Icon icon="tabler:plant" :height="40" />
            </div>
          </div>

          <div class="plant-info">
            <h3 class="plant-name">{{ plant.name || 'Unnamed' }}</h3>
            <p class="plant-strain">{{ plant.strain || 'Unknown strain' }}</p>

            <div class="plant-meta">
              <div class="meta-item">
                <Icon icon="tabler:calendar" :height="14" />
                <span>Day {{ getDaysSince(plant) }}</span>
              </div>
              <div class="meta-item">
                <Icon icon="tabler:heart" :height="14" />
                <span>{{ (plant as any).health || 100 }}%</span>
              </div>
            </div>
          </div>

          <div class="plant-arrow">
            <Icon icon="tabler:chevron-right" :height="20" />
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- FAB Button -->
    <button class="fab-button" @click="showAddModal" aria-label="Add plant">
      <Icon icon="tabler:plus" :height="28" />
    </button>

    <!-- Add Plant Modal -->
    <Teleport to="body">
      <div v-if="isAddModalOpen" class="modal-overlay" @click.self="closeAddModal">
        <div class="modal-container-wrapper">
          <button @click="closeAddModal" class="modal-close-btn" aria-label="Close add plant modal">
            <Icon icon="tabler:x" :height="24" />
          </button>
          <AddTreeModal @close-all="closeAddModal" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.my-trees-page {
  width: 100%;
  background: #0a0a0a;
  min-height: 100vh;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
  min-height: 60vh;
}

.empty-icon {
  color: #666;
  margin-bottom: 24px;
  opacity: 0.5;
}

.empty-state h2 {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 12px 0;
}

.empty-state p {
  font-size: 15px;
  color: #999;
  margin: 0;
}

.plants-container {
  padding: 20px 16px 100px;
}

.plants-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plant-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(20, 20, 20, 0.9) 100%);
  border: 1px solid rgba(123, 199, 77, 0.15);
  border-radius: 18px;
  text-decoration: none;
  transition: all 0.3s ease;
  -webkit-tap-highlight-color: transparent;
}

.plant-card:active {
  transform: scale(0.98);
  border-color: rgba(123, 199, 77, 0.3);
}

.plant-image {
  flex-shrink: 0;
  width: 70px;
  height: 70px;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(123, 199, 77, 0.1);
  border: 2px solid rgba(123, 199, 77, 0.2);
}

.plant-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.plant-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7bc74d;
}

.plant-info {
  flex: 1;
  min-width: 0;
}

.plant-name {
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plant-strain {
  font-size: 13px;
  color: #999;
  margin: 0 0 10px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plant-meta {
  display: flex;
  gap: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #7bc74d;
}

.plant-arrow {
  flex-shrink: 0;
  color: #666;
}

.fab-button {
  position: fixed;
  right: 20px;
  bottom: calc(100px + env(safe-area-inset-bottom));
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7bc74d 0%, #5a9e3a 100%);
  border: none;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(123, 199, 77, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 50;
  -webkit-tap-highlight-color: transparent;
}

.fab-button:active {
  transform: scale(0.92);
  box-shadow: 0 4px 16px rgba(123, 199, 77, 0.3), 0 2px 8px rgba(0, 0, 0, 0.3);
}

.fab-button::before {
  content: '';
  position: absolute;
  inset: -4px;
  background: radial-gradient(circle, rgba(123, 199, 77, 0.3) 0%, transparent 70%);
  border-radius: 50%;
  z-index: -1;
  animation: pulse-fab 2s ease-in-out infinite;
}

@keyframes pulse-fab {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-container-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  background: #0a0a0a;
}

.modal-close-btn {
  position: fixed;
  top: max(env(safe-area-inset-top), 20px);
  right: 20px;
  z-index: 10000;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.modal-close-btn:active {
  transform: scale(0.9);
  background: rgba(255, 68, 68, 0.9);
}
</style>

