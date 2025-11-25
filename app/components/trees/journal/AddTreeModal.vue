<script setup lang="ts">
import { IonButtons, modalController } from '@ionic/vue';
import { onMounted, onUnmounted, ref } from 'vue';
import { usePlants } from '../../../../composables/usePlants';
import germinationImg from '~/assets/germination.png';
import seedlingImg from '~/assets/seedling.png';
import vegetativeImg from '~/assets/vegetative.png';
import floweringImg from '~/assets/flowering.png';

const { addPlant } = usePlants();

const cancel = () => {
  if (typeof document !== 'undefined') {
    document.body.classList.remove('downbar-hidden');
  }
  return modalController.dismiss(null, 'cancel');
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.body.classList.add('downbar-hidden');
  }
});

onUnmounted(() => {
  if (typeof document !== 'undefined') {
    document.body.classList.remove('downbar-hidden');
  }
});

const showForm = ref(false);
const selectedStage = ref('');
const name = ref('');
const strain = ref('');
const photoFile = ref<File | null>(null);
const photoPreview = ref<string | null>(null);
const potSize = ref('');
const plantingDate = ref('');
const location = ref<'indoor' | 'outdoor'>('indoor');
const medium = ref('soil');

function revokePreview() {
  if (photoPreview.value) {
    try { URL.revokeObjectURL(photoPreview.value); } catch (e) {}
    photoPreview.value = null;
  }
}

function onAddClick(stage: string) {
  selectedStage.value = stage;
  name.value = '';
  strain.value = '';
  if (photoPreview.value) revokePreview();
  photoFile.value = null;
  potSize.value = '';
  plantingDate.value = '';
  location.value = 'indoor';
  medium.value = 'soil';
  showForm.value = true;
}

function onPhotoChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    if (photoPreview.value) revokePreview();
    photoFile.value = input.files[0];
    photoPreview.value = URL.createObjectURL(photoFile.value);
  }
}

function closeForm() {
  if (photoPreview.value) revokePreview();
  showForm.value = false;
}

function saveForm() {
  const plant = {
    id: Date.now(),
    stage: selectedStage.value,
    name: name.value,
    strain: strain.value,
    potSize: potSize.value,
    plantingDate: plantingDate.value,
    location: location.value,
    medium: medium.value,
    photoPreview: photoPreview.value
  };
  addPlant(plant);
  if (photoPreview.value) revokePreview();
  if (typeof document !== 'undefined') document.body.classList.remove('downbar-hidden');
  modalController.dismiss({ action: 'create', data: plant }, 'add-tree');
}
</script>

<template>
  <div class="header bg-[#202123]/30 backdrop-blur-sm">
    <ion-buttons slot="start">
      <button @click="cancel" class="cancel-btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="cancel-icon" role="img" aria-hidden="true"><path fill="currentColor" d="M16 22L6 12L16 2l1.775 1.775L9.55 12l8.225 8.225z" /></svg>
      </button>
    </ion-buttons>
  </div>

  <ion-content>
    <div class="pt-2 content">
      <ion-card color="dark">
        <div class="flex flex-row items-center justify-center">
          <img :src="germinationImg" alt="Germination" class="stage-img" />
        </div>
        <ion-card-header>
          <ion-card-title>Germination</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          Stage description.
        </ion-card-content>
        <div class="flex flex-row items-center justify-end">
          <ion-button shape="round" @click="onAddClick('germination')">Add Tree</ion-button>
        </div>
      </ion-card>
    </div>

    <div class="pt-9 content">
      <ion-card color="dark">
        <div class="flex flex-row items-center justify-center">
          <img :src="seedlingImg" alt="Seedling" class="stage-img" />
        </div>
        <ion-card-header>
          <ion-card-title>Seedling</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          Stage description.
        </ion-card-content>
        <div class="flex flex-row items-center justify-end">
          <ion-button shape="round" @click="onAddClick('seedling')">Add Tree</ion-button>
        </div>
      </ion-card>
    </div>

    <div class="pt-9 content">
      <ion-card color="dark">
        <div class="flex flex-row items-center justify-center">
          <img :src="vegetativeImg" alt="Vegetative" class="stage-img" />
        </div>
        <ion-card-header>
          <ion-card-title>Vegetative</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          Stage description.
        </ion-card-content>
        <div class="flex flex-row items-center justify-end">
          <ion-button shape="round" @click="onAddClick('vegetative')">Add Tree</ion-button>
        </div>
      </ion-card>
    </div>

    <div class="py-9 content">
      <ion-card color="dark">
        <div class="flex flex-row items-center justify-center">
          <img :src="floweringImg" alt="Flowering" class="stage-img" />
        </div>
        <ion-card-header>
          <ion-card-title>Flowering</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          Stage description.
        </ion-card-content>
        <div class="flex flex-row items-center justify-end">
          <ion-button shape="round" @click="onAddClick('flowering')">Add Tree</ion-button>
        </div>
      </ion-card>
    </div>
  </ion-content>


<!--  second modal-->~
  <div v-if="showForm" class="fixed inset-0 z-60 flex flex-col bg-[#0b0b0d] text-white">
    <div class="flex items-center justify-between p-4 border-b border-neutral-800">
      <h3 class="text-lg font-semibold">New plant — {{ selectedStage }}</h3>
      <button class="px-3 py-1 rounded-md bg-transparent text-white" @click="closeForm">Back</button>
    </div>

    <div class="flex-1 overflow-auto">
      <div class="p-4 space-y-4 max-w-3xl mx-auto">
        <div>
          <label class="block text-sm text-white">Name</label>
          <input v-model="name" class="w-full rounded border p-2 mt-1 bg-transparent text-white" />
        </div>

        <div>
          <label class="block text-sm text-white">Strain</label>
          <input v-model="strain" class="w-full rounded border p-2 mt-1 bg-transparent text-white" />
        </div>

        <div>
          <label class="block text-sm text-white">Photo</label>
          <input type="file" accept="image/*" @change="onPhotoChange" class="mt-1 text-white" />
          <div v-if="photoPreview" class="mt-2">
            <img :src="photoPreview" class="w-40 h-40 object-cover rounded" alt="preview" />
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-white">Pot size</label>
            <input v-model="potSize" class="w-full rounded border p-2 mt-1 bg-transparent text-white" placeholder="e.g. 3L" />
          </div>

          <div>
            <label class="block text-sm text-white">Planting date</label>
            <input type="date" v-model="plantingDate" class="w-full rounded border p-2 mt-1 bg-transparent text-white" />
          </div>
        </div>

        <div class="flex gap-4 items-center">
          <div>
            <label class="block text-sm text-white">Indoor / Outdoor</label>
            <select v-model="location" class="rounded border p-2 mt-1 bg-transparent text-white">
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
            </select>
          </div>

          <div>
            <label class="block text-sm text-white">Medium</label>
            <select v-model="medium" class="rounded border p-2 mt-1 bg-transparent text-white">
              <option value="soil">Soil</option>
              <option value="coco">Coco</option>
              <option value="hydro">Hydro</option>
            </select>
          </div>
        </div>

        <div class="flex justify-end gap-3">
          <button class="px-4 py-2 rounded bg-green-600 text-white" @click="saveForm">Save</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.header {
  color: #ffffff;
  box-shadow: 0 1px 0 rgba(0,0,0,0.06);
}

.cancel-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 6px;
  border-radius: 9999px;
  background: transparent;
  border: none;
  color: #ffffff;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.cancel-btn:hover { transform: translateY(-2px); }
.cancel-btn:active { transform: translateY(0); }
.cancel-btn:focus { outline: none; box-shadow: 0 0 0 6px rgba(255,255,255,0.06); }

.cancel-icon { width: 24px; height: 24px; display: block; color: currentColor; }

.stage-img { height: 220px; display: block; border-radius: 8px 8px 0 0; }

.content { color: #ffffff; }

.content ::v-deep(ion-card-title),
.content ::v-deep(ion-card-subtitle),
.content ::v-deep(ion-card-content) { color: #ffffff !important; --color: #ffffff; }

ion-button { --background: #7bc74d; --background-activated: #8fe658; --background-hover: #a3e681; --color: black; }

.content ::v-deep(ion-card) { padding: 14px !important; border-radius: 12px; }
.content ::v-deep(ion-card-header), .content ::v-deep(ion-card-content) { padding: 8px 0 !important; }
.content ::v-deep(ion-card-content) { padding-top: 12px !important; padding-bottom: 12px !important; }
</style>
