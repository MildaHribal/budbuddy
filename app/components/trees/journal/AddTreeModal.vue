<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { Icon } from "@iconify/vue";
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
    description: '1-7 days. Seeds cracking.'
  },
  {
    name: 'Seedling',
    image: seedlingImg,
    description: 'First true leaves.'
  },
  {
    name: 'Vegetative',
    image: vegetativeImg,
    description: 'Growth phase.'
  },
  {
    name: 'Flowering',
    image: floweringImg,
    description: 'Bud production.'
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
  }, 400);
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

  // Reset
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
  <div ref="scrollContainer" class="modal-container">
    <!-- First Screen - Stage Selection -->
    <div class="modal-screen">
      <div class="screen-content">
        <div class="modal-header">
          <div class="header-icon">🌱</div>
          <h2 class="header-title">Select Growth Stage</h2>
          <p class="header-subtitle">Choose your plant's current stage</p>
        </div>

        <div class="stages-grid">
          <div
            v-for="stage in stages"
            :key="stage.name"
            @click="selectStage(stage.name)"
            :class="['stage-card', { selected: selectedStage === stage.name }]"
          >
            <div class="stage-image-container">
              <img :src="stage.image" :alt="stage.name" class="stage-image" />
            </div>
            <div class="stage-info">
              <h3 class="stage-name">{{ stage.name }}</h3>
              <p class="stage-description">{{ stage.description }}</p>
            </div>
            <div v-if="selectedStage === stage.name" class="stage-checkmark">
              <Icon icon="tabler:check" :height="16" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Second Screen - Plant Details -->
    <div class="modal-screen">
      <div class="screen-header">
        <button @click="goBack" class="back-btn">
          <Icon icon="tabler:arrow-left" :height="20" />
          <span>Back</span>
        </button>
      </div>

      <div class="screen-content scrollable">
        <div class="form-section">
          <div class="photo-upload" @click="($refs.fileInput as any)?.click()">
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              @change="onPhotoChange"
              class="hidden-input"
            />
            <div v-if="photoPreview" class="photo-preview">
              <img :src="photoPreview" alt="Preview" />
            </div>
            <div v-else class="photo-placeholder">
              <Icon icon="tabler:camera" :height="40" />
              <span>Add Photo</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Plant Name</label>
            <input
              v-model="name"
              type="text"
              placeholder="e.g., Northern Lights #1"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Strain</label>
            <input
              v-model="strain"
              type="text"
              placeholder="e.g., Northern Lights"
              class="form-input"
            />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Pot Size</label>
              <input
                v-model="potSize"
                type="text"
                placeholder="e.g., 5 gal"
                class="form-input"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Planting Date</label>
              <input
                v-model="plantingDate"
                type="date"
                class="form-input"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Location</label>
              <select v-model="location" class="form-select">
                <option value="indoor">🏠 Indoor</option>
                <option value="outdoor">☀️ Outdoor</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Medium</label>
              <select v-model="medium" class="form-select">
                <option value="soil">🌱 Soil</option>
                <option value="coco">🥥 Coco</option>
                <option value="hydro">💧 Hydro</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="screen-footer">
        <button @click="save" :disabled="!selectedStage" class="save-btn">
          <Icon icon="tabler:check" :height="20" />
          <span>Save Plant</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-container {
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
}

.modal-screen {
  min-height: 100vh;
  width: 100%;
  scroll-snap-align: start;
  background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%);
  display: flex;
  flex-direction: column;
}

.screen-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.screen-content.scrollable {
  overflow-y: auto;
}

.modal-header {
  text-align: center;
  margin-bottom: 32px;
  padding-top: max(env(safe-area-inset-top), 20px);
}

.header-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.header-title {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}

.header-subtitle {
  font-size: 15px;
  color: #999;
}

.stages-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding-bottom: 24px;
}

.stage-card {
  position: relative;
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(20, 20, 20, 0.9) 100%);
  border: 2px solid rgba(123, 199, 77, 0.2);
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  -webkit-tap-highlight-color: transparent;
}

.stage-card:active {
  transform: scale(0.98);
}

.stage-card.selected {
  border-color: #7bc74d;
  background: linear-gradient(135deg, rgba(123, 199, 77, 0.15) 0%, rgba(90, 158, 58, 0.1) 100%);
  box-shadow: 0 0 20px rgba(123, 199, 77, 0.3);
}

.stage-image-container {
  width: 100%;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
}

.stage-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 12px;
}

.stage-info {
  text-align: center;
}

.stage-name {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}

.stage-card.selected .stage-name {
  color: #7bc74d;
}

.stage-description {
  font-size: 12px;
  color: #999;
}

.stage-checkmark {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #7bc74d;
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.screen-header {
  padding: max(env(safe-area-inset-top), 20px) 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(123, 199, 77, 0.1);
  border: 1px solid rgba(123, 199, 77, 0.2);
  border-radius: 12px;
  color: #7bc74d;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.back-btn:active {
  transform: scale(0.95);
  background: rgba(123, 199, 77, 0.2);
}

.form-section {
  padding: 24px 0;
}

.photo-upload {
  width: 140px;
  height: 140px;
  margin: 0 auto 32px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  -webkit-tap-highlight-color: transparent;
}

.photo-upload:active {
  transform: scale(0.95);
}

.photo-preview {
  width: 100%;
  height: 100%;
}

.photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(123, 199, 77, 0.1) 0%, rgba(90, 158, 58, 0.05) 100%);
  border: 2px dashed rgba(123, 199, 77, 0.3);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #7bc74d;
  font-size: 13px;
  font-weight: 600;
}

.hidden-input {
  display: none;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
}

.form-input,
.form-select {
  width: 100%;
  padding: 14px 16px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(123, 199, 77, 0.2);
  border-radius: 12px;
  color: #fff;
  font-size: 15px;
  transition: all 0.2s ease;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #7bc74d;
  background: rgba(123, 199, 77, 0.05);
}

.form-input::placeholder {
  color: #666;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.screen-footer {
  padding: 16px 24px calc(16px + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
}

.save-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px;
  background: linear-gradient(135deg, #7bc74d 0%, #5a9e3a 100%);
  border: none;
  border-radius: 14px;
  color: #000;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(123, 199, 77, 0.3);
  -webkit-tap-highlight-color: transparent;
}

.save-btn:active {
  transform: scale(0.98);
  box-shadow: 0 2px 8px rgba(123, 199, 77, 0.2);
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: linear-gradient(135deg, #666 0%, #444 100%);
  box-shadow: none;
}
</style>

