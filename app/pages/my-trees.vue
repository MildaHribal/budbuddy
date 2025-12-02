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
  selectedTree.value = null; // Resetuje výběr, takže příště se otevře první krok
  isAddModalOpen.value = false;
}
</script>

<template>
  <div class="relative min-h-screen pb-24">

    <div v-if="plants.length === 0" class="text-gray-400 text-center py-10 mt-10">
      <div class="text-4xl mb-4">🌱</div>
      <p>No plants yet.</p>
      <p class="text-sm">Click the + button to add one.</p>
    </div>

    <UPageList v-else>
      <template v-for="(p, i) in plants" :key="p.id || i">
        <NuxtLink :to="`/my_trees/${p.id}`" class="block no-underline mb-2">
          <UPageCard variant="ghost" :ui="{ body: { padding: 'p-0 sm:p-0' } }">
            <template #body>
              <div
                class="flex items-center gap-4 p-3 rounded-lg w-full hover:bg-white/5 transition border border-transparent hover:border-gray-800">
                <div class="flex-shrink-0">
                  <img v-if="p.photoPreview" :src="p.photoPreview" alt="photo" class="plant-thumb shadow-sm"/>
                  <div v-else class="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center text-xl">🌱
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-lg font-medium text-white truncate">{{ p.name || 'No Name' }}</div>
                  <div class="text-sm text-gray-400 truncate">{{ p.strain || 'Unknown Strain' }}</div>
                </div>
              </div>
            </template>
          </UPageCard>
        </NuxtLink>
      </template>
    </UPageList>

    <UModal scrollable fullscreen class="fixed  flex items-center justify-center" close-icon="i-lucide-x">
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

.plant-thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 50%;
  display: block;
  border: 2px solid #333;
}
</style>
