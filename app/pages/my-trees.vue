<script setup lang="ts">
import {ref, onMounted, onUnmounted} from 'vue';
import {usePlants} from '~/composables/usePlants';
import AddTreeModal from '~/components/trees/journal/AddTreeModal.vue';
import {useTreeModel} from "~/composables/useTreeModel";
import TreeFormModal from "~/components/trees/journal/TreeFormModal.vue";

const {plants, loadPlantsFromStorage} = usePlants();
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

const {selectedTree} = useTreeModel();

function handleClose() {
  selectedTree.value = null;
  isAddModalOpen.value = false;
}
</script>

<template>
  <div class="relative min-h-screen pb-24">
    <Header title="My Trees" />

    <div v-if="plants.length === 0" class="text-gray-400 text-center py-10 mt-10">
      <div class="text-4xl mb-4">🌱</div>
      <p>No plants yet.</p>
      <p class="text-sm">Click the + button to add one.</p>
    </div>

    <UPageList v-else>
      <template v-for="(p, i) in plants" :key="p.id || i">
        <NuxtLink :to="`/my_trees/${p.id}`" class="block no-underline mb-3">
          <div class="plant-card">
            <div class="plant-card-inner">
              <div class="flex items-center gap-4 p-4">
                <div class="flex-shrink-0">
                  <img v-if="p.photoPreview" :src="p.photoPreview" alt="photo" class="plant-thumb"/>
                  <div v-else class="plant-thumb-placeholder">🌱</div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-lg font-medium text-white truncate">{{ p.name || 'No Name' }}</div>
                  <div class="text-sm text-gray-400 truncate">{{ p.strain || 'Unknown Strain' }}</div>
                </div>
                <div class="plant-arrow">
                  <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </NuxtLink>
      </template>
    </UPageList>

    <UModal
      scrollable
      fullscreen
      class="fixed flex items-center justify-center"
      :ui="{
        container: 'items-center',
        wrapper: 'p-0',
        base: 'overflow-hidden p-0 m-0',
        padding: 'p-0',
        margin: 'm-0',
        body: 'p-0',
        header: 'absolute right-0 z-20',
        overlay: { base: 'p-0' }
      }"
    >
      <template #header>
      </template>

      <div class="fab-container">
        <UButton
          icon="i-heroicons-plus"
          size="xl"
          variant="solid"
          class="rounded-full bg-[#7bc74d] hover:bg-[#6ab340] text-black w-14 h-14 flex items-center justify-center shadow-lg transition-transform active:scale-95"
        />
      </div>
      <template #body>
        <TreeFormModal v-if="selectedTree" />
        <AddTreeModal v-else @close-all="isAddModalOpen = false" />
      </template>
    </UModal>

  </div>
</template>

<style scoped>
.fab-container {
  position: fixed;
  right: 20px;
  bottom: 90px;
  z-index: 50;
}

.plant-card {
  position: relative;
  border-radius: 16px;
  padding: 2px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}


.plant-thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 12px;
  display: block;
  border: 2px solid #7bc74d;
  box-shadow: 0 2px 8px rgba(123, 199, 77, 0.3);
  transition: transform 0.3s ease;
}

.plant-thumb-placeholder {
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  border: 2px solid #444;
  transition: all 0.3s ease;
}

.plant-arrow {
  opacity: 0.5;
}

</style>
