<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { Icon } from "@iconify/vue";
import { usePlants } from "~/composables/usePlants";
import { usePlantJournal } from "~/composables/usePlantJournal";

const { plants, loadPlantsFromStorage } = usePlants();

// All gallery items: profile photo + journal photos for every plant
interface GalleryItem {
  id: string;
  photo: string;
  plantId: string | number;
  plantName: string;
  date: string;
  isProfile: boolean;
}

const galleryItems = ref<GalleryItem[]>([]);
const loading = ref(true);

async function buildGallery() {
  loading.value = true;
  const items: GalleryItem[] = [];

  for (const plant of plants.value) {
    // 1) Profile photo
    if (plant.photoPreview) {
      items.push({
        id: `profile-${plant.id}`,
        photo: plant.photoPreview,
        plantId: plant.id,
        plantName: plant.name || "Unnamed",
        date: (plant as any).plantingDate || plant.createdAt || "",
        isProfile: true,
      });
    }

    // 2) Journal photos – load composable and await
    const j = usePlantJournal(plant.id);
    await j.load();
    for (const entry of j.allPhotos()) {
      if (entry.photo) {
        items.push({
          id: `journal-${entry.id}`,
          photo: entry.photo,
          plantId: plant.id,
          plantName: plant.name || "Unnamed",
          date: entry.date,
          isProfile: false,
        });
      }
    }
  }

  // Sort newest first
  galleryItems.value = items.sort((a, b) => b.date.localeCompare(a.date));
  loading.value = false;
}

onMounted(async () => {
  await loadPlantsFromStorage();
  await buildGallery();
});

watch(
  () => plants.value.length,
  async () => {
    await buildGallery();
  },
);

// ── Filters ──────────────────────────────────────────
type Filter = "all" | "profile" | "journal";
const activeFilter = ref<Filter>("all");

const filteredItems = computed(() => {
  if (activeFilter.value === "profile")
    return galleryItems.value.filter((i) => i.isProfile);
  if (activeFilter.value === "journal")
    return galleryItems.value.filter((i) => !i.isProfile);
  return galleryItems.value;
});

// Group by plant name for "All" view
const plantNames = computed(() => {
  const names = new Set<string>();
  galleryItems.value.forEach((i) => names.add(i.plantName));
  return ["All plants", ...Array.from(names)];
});
const selectedPlant = ref("All plants");

const displayedItems = computed(() => {
  let items = filteredItems.value;
  if (selectedPlant.value !== "All plants") {
    items = items.filter((i) => i.plantName === selectedPlant.value);
  }
  return items;
});

// ── Lightbox ─────────────────────────────────────────
const lightboxItem = ref<GalleryItem | null>(null);
function openLightbox(item: GalleryItem) {
  lightboxItem.value = item;
}
function closeLightbox() {
  lightboxItem.value = null;
}

function prevPhoto() {
  if (!lightboxItem.value) return;
  const items = displayedItems.value;
  const idx = items.findIndex((i) => i.id === lightboxItem.value!.id);
  if (idx > 0) lightboxItem.value = items[idx - 1];
}
function nextPhoto() {
  if (!lightboxItem.value) return;
  const items = displayedItems.value;
  const idx = items.findIndex((i) => i.id === lightboxItem.value!.id);
  if (idx < items.length - 1) lightboxItem.value = items[idx + 1];
}

const lightboxIdx = computed(() => {
  if (!lightboxItem.value) return -1;
  return displayedItems.value.findIndex((i) => i.id === lightboxItem.value!.id);
});

function fmtDate(iso: string) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}.${m}.${y}`;
}
</script>

<template>
  <div class="gallery-page">
    <!-- Header -->
    <div class="gallery-header">
      <div class="header-top">
        <div class="header-title">
          <Icon icon="tabler:photo-album" :height="26" style="color: #7bc74d" />
          <span>Gallery</span>
        </div>
        <div class="photo-count" v-if="galleryItems.length > 0">
          {{ galleryItems.length }} photo{{
            galleryItems.length !== 1 ? "s" : ""
          }}
        </div>
      </div>

      <!-- Filter pills -->
      <div class="filter-row">
        <button
          v-for="f in ['all', 'profile', 'journal'] as Filter[]"
          :key="f"
          :class="['filter-pill', { active: activeFilter === f }]"
          @click="
            activeFilter = f;
            selectedPlant = 'All plants';
          "
        >
          <Icon
            :icon="
              f === 'all'
                ? 'tabler:photos'
                : f === 'profile'
                  ? 'tabler:user-circle'
                  : 'tabler:notebook'
            "
            :height="14"
          />
          {{ f === "all" ? "All" : f === "profile" ? "Profile" : "Journal" }}
        </button>
      </div>

      <!-- Plant filter (horizontal scroll) -->
      <div v-if="plantNames.length > 2" class="plant-filter-scroll">
        <button
          v-for="name in plantNames"
          :key="name"
          :class="['plant-chip', { active: selectedPlant === name }]"
          @click="selectedPlant = name"
        >
          {{ name }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="gallery-loading">
      <div class="spinner"></div>
      <p>Loading photos…</p>
    </div>

    <!-- Empty state -->
    <div v-else-if="displayedItems.length === 0" class="gallery-empty">
      <div class="empty-icon-wrap">
        <Icon icon="tabler:photo-off" :height="52" style="color: #444" />
      </div>
      <h2>No photos yet</h2>
      <p>
        Add photos to your plants via the plant detail page (📷 Photo button in
        Journal).
      </p>
      <NuxtLink to="/my-trees" class="empty-cta">
        <Icon icon="tabler:leaf" :height="16" />
        Go to My Plants
      </NuxtLink>
    </div>

    <!-- Gallery grid -->
    <div v-else class="gallery-grid">
      <div
        v-for="(item, index) in displayedItems"
        :key="item.id"
        class="gallery-cell"
        :class="{ featured: index % 7 === 0 }"
        @click="openLightbox(item)"
      >
        <img :src="item.photo" :alt="item.plantName" loading="lazy" />

        <div class="cell-overlay">
          <div class="cell-info">
            <div class="cell-plant">
              <div class="cell-badge" :class="{ profile: item.isProfile }">
                <Icon
                  :icon="
                    item.isProfile ? 'tabler:user-circle' : 'tabler:notebook'
                  "
                  :height="10"
                />
              </div>
              {{ item.plantName }}
            </div>
            <div class="cell-date">{{ fmtDate(item.date) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lightbox -->
    <Teleport to="body">
      <div v-if="lightboxItem" class="lightbox" @click.self="closeLightbox">
        <!-- Close -->
        <button class="lb-close" @click="closeLightbox">
          <Icon icon="tabler:x" :height="22" />
        </button>

        <!-- Nav prev -->
        <button
          class="lb-nav prev"
          v-if="lightboxIdx > 0"
          @click.stop="prevPhoto"
        >
          <Icon icon="tabler:chevron-left" :height="26" />
        </button>

        <!-- Image -->
        <div class="lb-content" @click.stop>
          <img
            :src="lightboxItem.photo"
            class="lb-img"
            :alt="lightboxItem.plantName"
          />
          <div class="lb-meta">
            <div class="lb-badge" :class="{ profile: lightboxItem.isProfile }">
              <Icon
                :icon="
                  lightboxItem.isProfile
                    ? 'tabler:user-circle'
                    : 'tabler:notebook'
                "
                :height="13"
              />
              {{ lightboxItem.isProfile ? "Profile" : "Journal" }}
            </div>
            <div class="lb-plant">{{ lightboxItem.plantName }}</div>
            <div class="lb-date">{{ fmtDate(lightboxItem.date) }}</div>
          </div>
          <div class="lb-counter">
            {{ lightboxIdx + 1 }} / {{ displayedItems.length }}
          </div>
        </div>

        <!-- Nav next -->
        <button
          class="lb-nav next"
          v-if="lightboxIdx < displayedItems.length - 1"
          @click.stop="nextPhoto"
        >
          <Icon icon="tabler:chevron-right" :height="26" />
        </button>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.gallery-page {
  width: 100%;
  min-height: 100vh;
  background: #0a0a0a;
  padding-bottom: calc(90px + env(safe-area-inset-bottom));
}

/* ── Header ───────────────────────────────── */
.gallery-header {
  padding: max(env(safe-area-inset-top), 16px) 16px 0;
  background: linear-gradient(180deg, #111 0%, #0a0a0a 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 12px;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 24px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.01em;
}

.photo-count {
  font-size: 13px;
  font-weight: 600;
  color: #555;
  background: rgba(255, 255, 255, 0.05);
  padding: 5px 12px;
  border-radius: 20px;
}

/* ── Filters ──────────────────────────────── */
.filter-row {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}

.filter-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  color: #888;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
}
.filter-pill.active {
  background: rgba(123, 199, 77, 0.12);
  border-color: rgba(123, 199, 77, 0.35);
  color: #7bc74d;
}
.filter-pill:active {
  transform: scale(0.96);
}

.plant-filter-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
}
.plant-filter-scroll::-webkit-scrollbar {
  display: none;
}

.plant-chip {
  flex-shrink: 0;
  padding: 5px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 20px;
  color: #777;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
}
.plant-chip.active {
  background: rgba(123, 199, 77, 0.1);
  border-color: rgba(123, 199, 77, 0.3);
  color: #7bc74d;
}

/* ── Loading ──────────────────────────────── */
.gallery-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 80px 24px;
  color: #666;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(123, 199, 77, 0.2);
  border-top-color: #7bc74d;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Empty ─────────────────────────────────── */
.gallery-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 32px;
  text-align: center;
}
.empty-icon-wrap {
  width: 96px;
  height: 96px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}
.gallery-empty h2 {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}
.gallery-empty p {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0;
}
.empty-cta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 4px;
  padding: 11px 20px;
  background: rgba(123, 199, 77, 0.1);
  border: 1px solid rgba(123, 199, 77, 0.3);
  border-radius: 14px;
  color: #7bc74d;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
}
.empty-cta:active {
  transform: scale(0.96);
}

/* ── Grid ──────────────────────────────────── */
.gallery-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3px;
  padding: 3px;
}

.gallery-cell {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  cursor: pointer;
  background: rgba(30, 30, 30, 0.8);
}

/* Every 8th item spans 2 cols + 2 rows (featured) */
.gallery-cell.featured {
  grid-column: span 2;
  grid-row: span 2;
}

.gallery-cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}
.gallery-cell:active img {
  transform: scale(1.04);
}

.cell-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.75) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.22s;
  display: flex;
  align-items: flex-end;
}
.gallery-cell:active .cell-overlay {
  opacity: 1;
}

.cell-info {
  padding: 8px;
  width: 100%;
}
.cell-plant {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cell-badge {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  background: rgba(123, 199, 77, 0.3);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7bc74d;
}
.cell-badge.profile {
  background: rgba(79, 195, 247, 0.3);
  color: #4fc3f7;
}
.cell-date {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
}

/* ── Lightbox ──────────────────────────────── */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.96);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fadeIn 0.18s ease;
}
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.lb-close {
  position: absolute;
  top: max(env(safe-area-inset-top), 18px);
  right: 18px;
  z-index: 2;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.lb-close:active {
  background: rgba(255, 255, 255, 0.2);
}

.lb-nav {
  position: absolute;
  z-index: 2;
  width: 44px;
  height: 44px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.lb-nav.prev {
  left: 14px;
}
.lb-nav.next {
  right: 14px;
}
.lb-nav:active {
  background: rgba(255, 255, 255, 0.18);
  transform: scale(0.92);
}

.lb-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 92vw;
  max-height: 90vh;
}

.lb-img {
  max-width: 100%;
  max-height: 72vh;
  object-fit: contain;
  border-radius: 14px;
  display: block;
}

.lb-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding: 0 4px;
}

.lb-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 20px;
  background: rgba(123, 199, 77, 0.15);
  color: #7bc74d;
  font-size: 11px;
  font-weight: 700;
}
.lb-badge.profile {
  background: rgba(79, 195, 247, 0.15);
  color: #4fc3f7;
}

.lb-plant {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}
.lb-date {
  font-size: 12px;
  color: #666;
}

.lb-counter {
  margin-top: 8px;
  font-size: 12px;
  color: #555;
  font-weight: 600;
}
</style>
