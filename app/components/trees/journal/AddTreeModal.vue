<script setup lang="ts">
import { ref } from 'vue';
import StageCard from '~/components/trees/journal/StageCard.vue';
import TreeFormModal from '~/components/trees/journal/TreeFormModal.vue';

import germinationImg from '~/assets/germination.png';
import seedlingImg from '~/assets/seedling.png';
import vegetativeImg from '~/assets/vegetative.png';
import floweringImg from '~/assets/flowering.png';

const emit = defineEmits(['close-all']);

const selectedStage = ref<string | null>(null);

const isFormOpen = ref(false);
const formStage = ref('');

const toggleStage = (stageName: string) => {
  selectedStage.value = selectedStage.value === stageName ? null : stageName;
};

const openModalFor = (stageName: string) => {
  console.log('Otevírám formulář pro:', stageName);
  formStage.value = stageName;
  isFormOpen.value = true;
};

const handlePlantCreated = () => {
  isFormOpen.value = false;
  emit('close-all');
};
</script>

<template>
  <div class="relative w-full h-full bg-[color:var(--app-bg)] rounded-lg overflow-hidden" @click.stop>

    <div class="p-4">

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-20">
        <StageCard
          :image="germinationImg"
          title="Germination"
          description="1-7 days. Seeds cracking open."
          :is-active="selectedStage === 'Germination'"
          @select="toggleStage('Germination')"
          @add="openModalFor('Germination')"
        />

        <StageCard
          :image="seedlingImg"
          title="Seedling"
          description="First true leaves developing."
          :is-active="selectedStage === 'Seedling'"
          @select="toggleStage('Seedling')"
          @add="openModalFor('Seedling')"
        />

        <StageCard
          :image="vegetativeImg"
          title="Vegetative"
          description="Growth engine. Leaves and stems."
          :is-active="selectedStage === 'Vegetative'"
          @select="toggleStage('Vegetative')"
          @add="openModalFor('Vegetative')"
        />

        <StageCard
          :image="floweringImg"
          title="Flowering"
          description="Bud production phase."
          :is-active="selectedStage === 'Flowering'"
          @select="toggleStage('Flowering')"
          @add="openModalFor('Flowering')"
        />
      </div>
    </div>

    <TreeFormModal
      v-model="isFormOpen"
      :stage="formStage"
      @created="handlePlantCreated"
    />
  </div>
</template>
