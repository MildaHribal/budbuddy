<template>
  <div class="stats-page">
    <Header title="Statistics" icon="tabler:chart-bar" :show-back="true" />

    <div class="content-wrapper">
      <!-- Overall overview -->
      <section class="section">
        <h2 class="section-title">Overall Overview</h2>
        <div class="stats-grid">
          <div class="stat-box">
            <Icon icon="tabler:plant-2" :height="32" class="stat-icon" />
            <div class="stat-value">{{ totalPlants }}</div>
            <div class="stat-label">Total plants</div>
          </div>
          <div class="stat-box">
            <Icon icon="tabler:droplet-filled" :height="32" class="stat-icon blue" />
            <div class="stat-value">{{ totalWaterings }}</div>
            <div class="stat-label">Waterings</div>
          </div>
          <div class="stat-box">
            <Icon icon="tabler:calendar-check" :height="32" class="stat-icon" />
            <div class="stat-value">{{ totalDaysGrowing }}</div>
            <div class="stat-label">Days growing</div>
          </div>
          <div class="stat-box">
            <Icon icon="tabler:notebook" :height="32" class="stat-icon purple" />
            <div class="stat-value">{{ totalEntries }}</div>
            <div class="stat-label">Journal entries</div>
          </div>
        </div>
      </section>

      <!-- Activity chart -->
      <section class="section">
        <h2 class="section-title">Activity This Week</h2>
        <div class="chart-container">
          <div class="chart-bars">
            <div
              class="chart-bar"
              v-for="(day, index) in weekActivity"
              :key="index"
            >
              <div
                class="bar-fill"
                :style="{ height: (maxWeekActivity > 0 ? (day.count / maxWeekActivity) * 100 : 0) + '%' }"
              >
                <div class="bar-value" v-if="day.count > 0">{{ day.count }}</div>
              </div>
              <div class="bar-label">{{ day.label }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Plant breakdown -->
      <section class="section" v-if="plantBreakdown.length > 0">
        <h2 class="section-title">Plant Breakdown</h2>
        <div class="strains-list">
          <div
            class="strain-item"
            v-for="(p, index) in plantBreakdown"
            :key="index"
          >
            <div class="strain-rank">{{ index + 1 }}</div>
            <div class="strain-info">
              <div class="strain-name">{{ p.name }}</div>
              <div class="strain-stats">
                <span>{{ p.strain || 'Unknown strain' }}</span>
                <span class="dot">•</span>
                <span>Day {{ p.days }}</span>
              </div>
            </div>
            <div class="strain-rating" :style="{ color: getStageColor(p.stage) }">
              <Icon :icon="getStageIcon(p.stage)" :height="16" />
              <span>{{ p.stage }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Achievements -->
      <section class="section">
        <h2 class="section-title">🏆 Achievements</h2>
        <div class="achievements-grid">
          <div :class="['achievement', totalPlants >= 1 ? 'unlocked' : 'locked']">
            <Icon icon="tabler:plant" :height="40" />
            <div class="achievement-name">First plant</div>
          </div>
          <div :class="['achievement', totalEntries >= 7 ? 'unlocked' : 'locked']">
            <Icon icon="tabler:flame" :height="40" />
            <div class="achievement-name">7+ entries</div>
          </div>
          <div :class="['achievement', totalPhotos >= 5 ? 'unlocked' : 'locked']">
            <Icon icon="tabler:camera" :height="40" />
            <div class="achievement-name">5+ photos</div>
          </div>
          <div :class="['achievement', totalPlants >= 5 ? 'unlocked' : 'locked']">
            <Icon icon="tabler:crown" :height="40" />
            <div class="achievement-name">5+ plants</div>
          </div>
        </div>
      </section>

      <!-- Journal activity breakdown -->
      <section class="section" v-if="totalEntries > 0">
        <h2 class="section-title">📊 Journal Activity</h2>
        <div class="trends-list">
          <div class="trend-item" :class="totalWaterings > 0 ? 'positive' : 'neutral'">
            <Icon icon="tabler:droplet-filled" :height="24" />
            <div class="trend-info">
              <div class="trend-label">Waterings</div>
              <div class="trend-value">{{ totalWaterings }} total</div>
            </div>
          </div>
          <div class="trend-item" :class="totalFeedings > 0 ? 'positive' : 'neutral'">
            <Icon icon="tabler:flask" :height="24" />
            <div class="trend-info">
              <div class="trend-label">Feedings</div>
              <div class="trend-value">{{ totalFeedings }} total</div>
            </div>
          </div>
          <div class="trend-item" :class="totalPhotos > 0 ? 'positive' : 'neutral'">
            <Icon icon="tabler:camera" :height="24" />
            <div class="trend-info">
              <div class="trend-label">Photos</div>
              <div class="trend-value">{{ totalPhotos }} total</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Empty state if no data -->
      <section v-if="totalPlants === 0 && !loading" class="empty-stats">
        <Icon icon="tabler:chart-bar-off" :height="60" style="color: #444" />
        <p>No data yet. Start by adding your first plant!</p>
        <NuxtLink to="/my-trees" class="empty-cta">
          <Icon icon="tabler:plus" :height="16" />
          Add Plant
        </NuxtLink>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { Icon } from "@iconify/vue";
import Header from "~/components/Header.vue";
import { usePlants } from "~/composables/usePlants";
import { usePlantJournal } from "~/composables/usePlantJournal";
import { useHead } from "#imports";

useHead({ title: 'Statistics' });

const { plants, loadPlantsFromStorage } = usePlants();
const loading = ref(true);

// Journal entries for all plants
const allJournalEntries = ref<any[]>([]);

async function loadAllData() {
  loading.value = true;
  await loadPlantsFromStorage();

  const entries: any[] = [];
  for (const plant of plants.value) {
    const journal = usePlantJournal(plant.id);
    await journal.load();
    entries.push(...journal.entries.value);
  }
  allJournalEntries.value = entries;
  loading.value = false;
}

onMounted(() => loadAllData());

// Computed stats
const totalPlants = computed(() => plants.value.length);

const totalWaterings = computed(
  () => allJournalEntries.value.filter((e) => e.type === "water").length,
);
const totalFeedings = computed(
  () => allJournalEntries.value.filter((e) => e.type === "nutrients").length,
);
const totalPhotos = computed(
  () => allJournalEntries.value.filter((e) => e.type === "photo").length,
);
const totalEntries = computed(() => allJournalEntries.value.length);

const totalDaysGrowing = computed(() => {
  return plants.value.reduce((acc: number, p: any) => {
    const dateStr = p.plantingDate || p.createdAt;
    if (!dateStr) return acc;
    const days = Math.max(
      0,
      Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000),
    );
    return acc + days;
  }, 0);
});

// Week activity
const weekActivity = computed(() => {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const now = new Date();
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - dow);
  monday.setHours(0, 0, 0, 0);

  return days.map((label, i) => {
    const dayDate = new Date(monday);
    dayDate.setDate(monday.getDate() + i);
    const iso = dayDate.toISOString().slice(0, 10);
    const count = allJournalEntries.value.filter(
      (e) => e.date === iso,
    ).length;
    return { label, count };
  });
});

const maxWeekActivity = computed(() =>
  Math.max(...weekActivity.value.map((d) => d.count), 1),
);

// Plant breakdown
const plantBreakdown = computed(() => {
  return plants.value.map((p: any) => {
    const dateStr = p.plantingDate || p.createdAt;
    const days = dateStr
      ? Math.max(
          0,
          Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000),
        )
      : 0;
    return {
      name: p.name || "Unnamed",
      strain: p.strain || "",
      stage: p.stage || "Seedling",
      days,
    };
  });
});

function getStageColor(stage: string): string {
  const map: Record<string, string> = {
    Germination: "#9fe76d",
    Seedling: "#7bc74d",
    Vegetative: "#4fc3f7",
    Flowering: "#f472b6",
  };
  return map[stage] ?? "#7bc74d";
}

function getStageIcon(stage: string): string {
  const map: Record<string, string> = {
    Germination: "tabler:seeding",
    Seedling: "tabler:plant",
    Vegetative: "tabler:tree",
    Flowering: "tabler:flower",
  };
  return map[stage] ?? "tabler:plant";
}
</script>

<style scoped>
.stats-page {
  width: 100%;
  background: #0a0a0a;
  min-height: 100vh;
  padding-bottom: calc(100px + env(safe-area-inset-bottom));
}

.content-wrapper {
  padding: 20px 16px;
}

.section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 16px;
  letter-spacing: -0.01em;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.stat-box {
  padding: 20px;
  background: linear-gradient(
    135deg,
    rgba(30, 30, 30, 0.9) 0%,
    rgba(20, 20, 20, 0.9) 100%
  );
  border: 1px solid rgba(123, 199, 77, 0.15);
  border-radius: 18px;
  text-align: center;
}

.stat-icon {
  color: #7bc74d;
  margin-bottom: 12px;
}

.stat-icon.blue {
  color: #4fc3f7;
}

.stat-icon.purple {
  color: #a78bfa;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6px;
}

.stat-label {
  font-size: 12px;
  color: #999;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.chart-container {
  padding: 24px 20px;
  background: linear-gradient(
    135deg,
    rgba(30, 30, 30, 0.9) 0%,
    rgba(20, 20, 20, 0.9) 100%
  );
  border: 1px solid rgba(123, 199, 77, 0.15);
  border-radius: 18px;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 8px;
  height: 160px;
}

.chart-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  height: 100%;
  justify-content: flex-end;
}

.bar-fill {
  width: 100%;
  background: linear-gradient(180deg, #9fe76d 0%, #7bc74d 50%, #5a9e3a 100%);
  border-radius: 8px 8px 0 0;
  position: relative;
  transition: height 0.5s ease;
  min-height: 4px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 6px;
}

.bar-value {
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.bar-label {
  font-size: 12px;
  color: #999;
  font-weight: 600;
}

.strains-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.strain-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: linear-gradient(
    135deg,
    rgba(30, 30, 30, 0.9) 0%,
    rgba(20, 20, 20, 0.9) 100%
  );
  border: 1px solid rgba(123, 199, 77, 0.15);
  border-radius: 16px;
}

.strain-rank {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #7bc74d 0%, #5a9e3a 100%);
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.strain-info {
  flex: 1;
}

.strain-name {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}

.strain-stats {
  font-size: 12px;
  color: #999;
  display: flex;
  align-items: center;
  gap: 6px;
}

.dot {
  color: #666;
}

.strain-rating {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 700;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.achievement {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 16px;
  background: linear-gradient(
    135deg,
    rgba(30, 30, 30, 0.9) 0%,
    rgba(20, 20, 20, 0.9) 100%
  );
  border: 1px solid rgba(123, 199, 77, 0.15);
  border-radius: 16px;
  text-align: center;
  transition: all 0.3s ease;
}

.achievement.unlocked {
  color: #7bc74d;
  border-color: rgba(123, 199, 77, 0.3);
}

.achievement.locked {
  color: #444;
  opacity: 0.5;
}

.achievement-name {
  font-size: 13px;
  font-weight: 600;
}

.trends-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.trend-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: linear-gradient(
    135deg,
    rgba(30, 30, 30, 0.9) 0%,
    rgba(20, 20, 20, 0.9) 100%
  );
  border: 1px solid rgba(123, 199, 77, 0.15);
  border-radius: 16px;
}

.trend-item.positive {
  border-color: rgba(123, 199, 77, 0.3);
  color: #7bc74d;
}

.trend-item.neutral {
  border-color: rgba(255, 255, 255, 0.08);
  color: #666;
}

.trend-info {
  flex: 1;
}

.trend-label {
  font-size: 13px;
  color: #999;
  margin-bottom: 4px;
}

.trend-value {
  font-size: 15px;
  font-weight: 700;
}

/* Empty state */
.empty-stats {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 32px;
  text-align: center;
}

.empty-stats p {
  font-size: 15px;
  color: #666;
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
</style>
