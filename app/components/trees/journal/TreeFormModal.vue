<script setup lang="ts">
import { ref, watch } from 'vue';
import { usePlants } from '~/composables/usePlants';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  stage: { type: String, default: '' }
});

const emit = defineEmits(['update:modelValue', 'created']);

const { addPlant } = usePlants();

const open = ref(!!props.modelValue);
watch(() => props.modelValue, (v) => open.value = !!v);
watch(open, (v) => emit('update:modelValue', v));

const name = ref('');
const strain = ref('');
const photoFile = ref<File | null>(null);
const photoPreview = ref<string | null>(null);
const potSize = ref('');
const plantingDate = ref(new Date().toISOString().split('T')[0]);
const location = ref<'indoor' | 'outdoor'>('indoor');
const medium = ref('soil');

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
  let photoData: string | undefined = photoPreview.value ?? undefined;

  if (photoFile.value) {
    try { photoData = await fileToDataUrl(photoFile.value); } catch (e) { console.error(e); }
  }

  const plant = {
    id: Date.now(),
    stage: props.stage,
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

  emit('created', plant);

  open.value = false;

  name.value = '';
  strain.value = '';
  revokePreview();
}

function close() {
  revokePreview();
  open.value = false;
}
</script>

<template>
    <div class="flex items-center justify-center px-4 py-3 border-b border-neutral-800 bg-[#121212]">
      <div>
        <h3 class="text-lg font-semibold text-white">New Plant</h3>
        <div class="text-sm text-[#7bc74d]">Starting at: {{ props.stage }}</div>
      </div>
    </div>

    <div class="p-4 space-y-4 bg-[#121212]">

      <div class="flex justify-center mb-6">
        <div class="relative w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-600 hover:border-[#7bc74d] transition cursor-pointer" @click="($refs.fileInput as HTMLInputElement)?.click()">
          <img v-if="photoPreview" :src="photoPreview" class="w-full h-full object-cover" />
          <div v-else class="text-center p-2">
            <span class="text-2xl">📷</span>
            <p class="text-xs text-gray-400 mt-1">Add Photo</p>
          </div>
        </div>
        <input ref="fileInput" type="file" accept="image/*" @change="onPhotoChange" class="hidden" />
      </div>

      <div>
        <label class="block text-sm text-gray-400 mb-1">Name</label>
        <input v-model="name" class="w-full rounded-lg border border-gray-700 p-3 bg-white/5 text-white focus:border-[#7bc74d] focus:outline-none transition" placeholder="My Awesome Plant" />
      </div>

      <div>
        <label class="block text-sm text-gray-400 mb-1">Strain</label>
        <input v-model="strain" class="w-full rounded-lg border border-gray-700 p-3 bg-white/5 text-white focus:border-[#7bc74d] focus:outline-none transition" placeholder="e.g. OG Kush" />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Pot size</label>
          <input v-model="potSize" class="w-full rounded-lg border border-gray-700 p-3 bg-white/5 text-white focus:border-[#7bc74d] focus:outline-none transition" placeholder="e.g. 11L" />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Date</label>
          <input type="date" v-model="plantingDate" class="w-full rounded-lg border border-gray-700 p-3 bg-white/5 text-white focus:border-[#7bc74d] focus:outline-none transition" />
        </div>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Location</label>
          <select v-model="location" class="w-full rounded-lg border border-gray-700 p-3 bg-white/5 text-white focus:border-[#7bc74d] focus:outline-none transition">
            <option value="indoor">🏠 Indoor</option>
            <option value="outdoor">☀️ Outdoor</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Medium</label>
          <select v-model="medium" class="w-full rounded-lg border border-gray-700 p-3 bg-white/5 text-white focus:border-[#7bc74d] focus:outline-none transition">
            <option value="soil">Soil</option>
            <option value="coco">Coco</option>
            <option value="hydro">Hydro</option>
          </select>
        </div>
      </div>
    </div>

      <div class="p-4 border-t border-neutral-800 flex justify-end bg-[#121212]">
        <UButton label="Save Plant" size="lg" block color="primary" class="bg-[#7bc74d] hover:bg-[#6ab340] text-black font-bold" @click="save" />
      </div>

</template>
