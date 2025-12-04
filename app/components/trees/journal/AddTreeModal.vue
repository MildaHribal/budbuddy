<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { usePlants } from '~/composables/usePlants';

import germinationImg from '~/assets/germination.png';
import seedlingImg from '~/assets/seedling.png';
import vegetativeImg from '~/assets/vegetative.png';
import floweringImg from '~/assets/flowering.png';

const emit = defineEmits(['close-all']);

const { addPlant } = usePlants();

const scrollContainer = ref<HTMLElement | null>(null);
const selectedStage = ref<string | null>(null);

const name = ref('');
const strain = ref('');
const photoFile = ref<File | null>(null);
const photoPreview = ref<string | null>(null);
const potSize = ref('');
const plantingDate = ref(new Date().toISOString().split('T')[0]);
const location = ref<'indoor' | 'outdoor'>('indoor');
const medium = ref('soil');

const stages = [
  {
    name: 'Germination',
    image: germinationImg,
    description: '1-7 days. Seeds cracking open.'
  },
  {
    name: 'Seedling',
    image: seedlingImg,
    description: 'First true leaves developing.'
  },
  {
    name: 'Vegetative',
    image: vegetativeImg,
    description: 'Growth engine. Leaves and stems.'
  },
  {
    name: 'Flowering',
    image: floweringImg,
    description: 'Bud production phase.'
  }
];

const selectStage = async (stageName: string) => {
  selectedStage.value = stageName;
  await nextTick();

  if (scrollContainer.value) {
    scrollContainer.value.scrollTo({
      top: scrollContainer.value.scrollHeight,
      behavior: 'smooth'
    });
  }
};

const goBack = async () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  setTimeout(() => {
    selectedStage.value = null;
  }, 600);
};

function revokePreview() {
  if (photoPreview.value && photoPreview.value.startsWith('blob:')) {
    try { URL.revokeObjectURL(photoPreview.value); } catch (e) {}
  }
  photoPreview.value = null;
}

function onPhotoChange(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    revokePreview();
    photoFile.value = input.files[0];
    photoPreview.value = URL.createObjectURL(photoFile.value);
  }
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function save() {
  if (!selectedStage.value) return;

  let photoData: string | undefined = photoPreview.value ?? undefined;

  if (photoFile.value) {
    try { photoData = await fileToDataUrl(photoFile.value); } catch (e) { console.error(e); }
  }

  const plant = {
    id: Date.now(),
    stage: selectedStage.value,
    name: name.value || 'Unnamed Plant',
    strain: strain.value,
    potSize: potSize.value,
    plantingDate: plantingDate.value,
    location: location.value,
    medium: medium.value,
    photoPreview: photoData
  };

  addPlant(plant);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('plants-updated', { detail: plant }));
  }

  name.value = '';
  strain.value = '';
  potSize.value = '';
  plantingDate.value = new Date().toISOString().split('T')[0];
  location.value = 'indoor';
  medium.value = 'soil';
  revokePreview();
  photoFile.value = null;
  selectedStage.value = null;

  emit('close-all');
}
</script>

<template>
<!--  first modal-->
  <div
    ref="scrollContainer"
    class="relative w-full h-full overflow-y-hidden overflow-x-hidden scroll-smooth"
    style="scroll-behavior: smooth; scroll-snap-type: y mandatory;"
    @click.stop
  >
    <div
      class="min-h-full flex flex-col p-6 bg-gradient-to-br from-[#1a1a1a] via-[#0d0d0d] to-black"
      style="scroll-snap-align: start;"
    >
      <div class="flex-shrink-0 mb-8 text-center">
        <div class="inline-block p-4 bg-gradient-to-r from-[#7bc74d]/20 to-[#6ab340]/20 rounded-2xl mb-4">
          <span class="text-5xl">🌱</span>
        </div>
        <h2 class="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
          Select Growth Stage
        </h2>
        <p class="text-gray-400 text-sm">Choose the current stage of your plant to begin</p>
      </div>

      <div class="grid grid-cols-2 gap-5 flex-1 px-2">
        <div
          v-for="stage in stages"
          :key="stage.name"
          @click="selectStage(stage.name)"
          :class="[
            'group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer',
            'transform transition-all duration-300 ease-out',
            'hover:scale-105 hover:-translate-y-1',
            'shadow-lg hover:shadow-2xl hover:shadow-[#7bc74d]/20',
            selectedStage === stage.name
              ? 'ring-2 ring-[#7bc74d] scale-105 shadow-2xl shadow-[#7bc74d]/30'
              : 'bg-gradient-to-br from-black/40 to-black/60 backdrop-blur-sm'
          ]"
        >
          <div
            v-if="selectedStage === stage.name"
            class="absolute inset-0 bg-gradient-to-br from-[#7bc74d]/10 to-transparent pointer-events-none z-0"
          ></div>

          <div class="relative w-full h-44 overflow-hidden bg-gradient-to-b from-black/30 to-black/50">
            <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
            <img
              :src="stage.image"
              :alt="stage.name"
              class="w-full h-full object-contain p-4 transform group-hover:scale-110 transition-transform duration-500 relative z-10"
            />
          </div>

          <div class="p-4 relative z-10">
            <h4
              :class="[
                'font-bold text-lg mb-1.5 transition-colors duration-300',
                selectedStage === stage.name ? 'text-[#7bc74d]' : 'text-white group-hover:text-[#7bc74d]'
              ]"
            >
              {{ stage.name }}
            </h4>
            <p class="text-gray-400 text-xs leading-relaxed">{{ stage.description }}</p>
          </div>

          <div
            v-if="selectedStage === stage.name"
            class="absolute top-3 right-3 bg-[#7bc74d] rounded-full p-1.5 shadow-lg z-20"
          >
            <svg class="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      </div>

      <div class="flex-shrink-0 flex justify-center pt-8 pb-4">
        <div class="text-center opacity-50 hover:opacity-100 transition-opacity">
          <p class="text-xs text-gray-500 mb-2">Tap a stage to continue</p>
          <div class="animate-bounce">
            <svg class="w-6 h-6 text-gray-600 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>
    </div>

<!--    second modal-->
    <div
      class="min-h-full flex flex-col bg-gradient-to-br from-[#1a1a1a] via-[#0f0f0f] to-black"
      style="scroll-snap-align: start;"
    >
      <div class="flex-shrink-0 flex items-center justify-start px-5 py-5 border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <button
          @click="goBack"
          class="flex items-center gap-2.5 text-gray-400 hover:text-white transition-all duration-200 hover:gap-3 group"
        >
          <div class="bg-white/5 group-hover:bg-white/10 rounded-lg p-2 transition-colors">
            <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </div>
          <span class="font-medium">Back</span>
        </button>

      </div>

      <div class="flex-1 p-6 space-y-5 overflow-y-auto custom-scrollbar">
        <div class="flex justify-between mb-8">
          <div
            class="relative w-36 h-36 bg-gradient-to-br from-gray-800 to-gray-900 rounded-full flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-600 hover:border-[#7bc74d] transition-all duration-300 cursor-pointer group shadow-xl hover:shadow-2xl hover:shadow-[#7bc74d]/20 hover:scale-105"
            @click="($refs.fileInput as HTMLInputElement)?.click()"
          >
            <img v-if="photoPreview" :src="photoPreview" alt="Plant preview" class="w-full h-full object-cover" />
            <div v-else class="text-center p-3">
              <span class="text-4xl group-hover:scale-110 transition-transform inline-block">📷</span>
              <p class="text-xs text-gray-400 mt-2 font-medium">Add Photo</p>
            </div>

            <div v-if="!photoPreview" class="absolute inset-0 bg-[#7bc74d]/0 group-hover:bg-[#7bc74d]/10 transition-colors duration-300"></div>
          </div>
          <div class="text-center">
            <h3 class="text-xl font-bold text-white mb-0.5">New Plant</h3>
            <div class="text-sm font-semibold text-[#7bc74d] flex items-center gap-1.5 justify-center">
              <span class="w-2 h-2 bg-[#7bc74d] rounded-full animate-pulse"></span>
              {{ selectedStage || 'No stage selected' }}
            </div>
          </div>
          <input ref="fileInput" type="file" accept="image/*" @change="onPhotoChange" class="hidden" />
        </div>


        <div class="space-y-5">
          <div class="group">
            <label class="block text-sm font-medium text-gray-400 mb-2 group-focus-within:text-[#7bc74d] transition-colors">
              Plant Name
            </label>
            <input
              v-model="name"
              class="w-full rounded-xl border border-gray-700 p-3.5 bg-black/30 text-white placeholder-gray-500 focus:border-[#7bc74d] focus:ring-2 focus:ring-[#7bc74d]/20 focus:outline-none transition-all shadow-inner"
              placeholder="My Awesome Plant"
            />
          </div>

          <div class="group">
            <label class="block text-sm font-medium text-gray-400 mb-2 group-focus-within:text-[#7bc74d] transition-colors">
              Strain
            </label>
            <input
              v-model="strain"
              class="w-full rounded-xl border border-gray-700 p-3.5 bg-black/30 text-white placeholder-gray-500 focus:border-[#7bc74d] focus:ring-2 focus:ring-[#7bc74d]/20 focus:outline-none transition-all shadow-inner"
              placeholder="e.g. OG Kush"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="group">
              <label class="block text-sm font-medium text-gray-400 mb-2 group-focus-within:text-[#7bc74d] transition-colors">
                Pot Size
              </label>
              <input
                v-model="potSize"
                class="w-full rounded-xl border border-gray-700 p-3.5 bg-black/30 text-white placeholder-gray-500 focus:border-[#7bc74d] focus:ring-2 focus:ring-[#7bc74d]/20 focus:outline-none transition-all shadow-inner"
                placeholder="e.g. 11L"
              />
            </div>
            <div class="group">
              <label class="block text-sm font-medium text-gray-400 mb-2 group-focus-within:text-[#7bc74d] transition-colors">
                Planting Date
              </label>
              <input
                type="date"
                v-model="plantingDate"
                class="w-full rounded-xl border border-gray-700 p-3.5 bg-black/30 text-white focus:border-[#7bc74d] focus:ring-2 focus:ring-[#7bc74d]/20 focus:outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="group">
              <label class="block text-sm font-medium text-gray-400 mb-2 group-focus-within:text-[#7bc74d] transition-colors">
                Location
              </label>
              <select
                v-model="location"
                class="w-full rounded-xl border border-gray-700 p-3.5 bg-black/30 text-white focus:border-[#7bc74d] focus:ring-2 focus:ring-[#7bc74d]/20 focus:outline-none transition-all shadow-inner cursor-pointer"
              >
                <option value="indoor">🏠 Indoor</option>
                <option value="outdoor">☀️ Outdoor</option>
              </select>
            </div>
            <div class="group">
              <label class="block text-sm font-medium text-gray-400 mb-2 group-focus-within:text-[#7bc74d] transition-colors">
                Growing Medium
              </label>
              <select
                v-model="medium"
                class="w-full rounded-xl border border-gray-700 p-3.5 bg-black/30 text-white focus:border-[#7bc74d] focus:ring-2 focus:ring-[#7bc74d]/20 focus:outline-none transition-all shadow-inner cursor-pointer"
              >
                <option value="soil">🌱 Soil</option>
                <option value="coco">🥥 Coco</option>
                <option value="hydro">💧 Hydro</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="flex-shrink-0 p-6 border-t border-white/10 bg-black/40 backdrop-blur-xl">
        <button
          @click="save"
          :disabled="!selectedStage"
          class="w-full bg-gradient-to-r from-[#7bc74d] to-[#6ab340] hover:from-[#6ab340] hover:to-[#5aa230] disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-black disabled:text-gray-500 font-bold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-95 shadow-lg hover:shadow-xl hover:shadow-[#7bc74d]/30 disabled:shadow-none"
        >
          <span class="flex items-center justify-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            Save Plant
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(123, 199, 77, 0.3);
  border-radius: 10px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(123, 199, 77, 0.5);
}

div[ref="scrollContainer"] {
  scroll-behavior: smooth;
}
</style>

