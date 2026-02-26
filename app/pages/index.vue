<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { Icon } from "@iconify/vue";
import { usePlants } from "~/composables/usePlants";
import { useDayActions } from "~/composables/useDayActions";

const { plants, loadPlantsFromStorage } = usePlants();

// Today date info
const today = new Date();
const todayKey = (() => {
  const offset = today.getTimezoneOffset();
  const local = new Date(today.getTime() - offset * 60 * 1000);
  return local.toISOString().split("T")[0];
})();

const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const todayName = dayNames[today.getDay()];
const todayDate = `${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear()}`;

// Global day actions (tasks) for today
const dayStore = useDayActions(todayKey);
const globalTasks = computed(() => dayStore.actions.value);
const completedTasks = computed(
  () => globalTasks.value.filter((t) => t.done).length,
);
const totalTasks = computed(() => globalTasks.value.length);
const taskProgress = computed(() =>
  totalTasks.value > 0
    ? Math.round((completedTasks.value / totalTasks.value) * 100)
    : 0,
);

// New task input
const newTaskText = ref("");
const isAddingTask = ref(false);

async function addTask() {
  const label = newTaskText.value.trim();
  if (!label) return;
  await dayStore.add(label);
  newTaskText.value = "";
  isAddingTask.value = false;
}

async function toggleTask(id: string, done: boolean) {
  await dayStore.toggle(id, done);
}

async function removeTask(id: string) {
  await dayStore.remove(id);
}

// Per-plant stats computed from real data
const activePlants = computed(() => plants.value);

function getDaysSince(dateStr: string): number {
  if (!dateStr) return 0;
  const start = new Date(dateStr);
  const diff = today.getTime() - start.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function getStageDays(stage: string): number {
  const map: Record<string, number> = {
    Germination: 7,
    Seedling: 21,
    Vegetative: 56,
    Flowering: 63,
  };
  return map[stage] ?? 30;
}

function getStageColor(stage: string): string {
  const map: Record<string, string> = {
    Germination: "#9fe76d",
    Seedling: "#7bc74d",
    Vegetative: "#4db8ff",
    Flowering: "#ff7eb0",
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

function getHealthIcon(pct: number): string {
  if (pct >= 80) return "tabler:heart-filled";
  if (pct >= 50) return "tabler:heart-half";
  return "tabler:heart-broken";
}

function getHealthColor(pct: number): string {
  if (pct >= 80) return "#7bc74d";
  if (pct >= 50) return "#ffaa00";
  return "#ff4444";
}

// Overall stats
const totalActivePlants = computed(() => plants.value.length);
const avgHealth = computed(() => {
  if (!plants.value.length) return 100;
  const total = plants.value.reduce(
    (acc: number, p: any) => acc + (p.health ?? 100),
    0,
  );
  return Math.round(total / plants.value.length);
});
const totalDaysGrowing = computed(() => {
  if (!plants.value.length) return 0;
  return plants.value.reduce(
    (acc: number, p: any) => acc + getDaysSince(p.plantingDate || p.createdAt),
    0,
  );
});

// Grow tips carousel
const tips = [
  {
    icon: "tabler:droplet",
    text: "Water when the top 2–3 cm of soil is dry to the touch.",
  },
  {
    icon: "tabler:temperature",
    text: "Keep temps between 20–28 °C during the light cycle.",
  },
  {
    icon: "tabler:wind",
    text: "Good airflow prevents mold and strengthens stems.",
  },
  {
    icon: "tabler:sun",
    text: "Monitor VPD to optimize transpiration and nutrient uptake.",
  },
  {
    icon: "tabler:test-pipe",
    text: "Check and adjust pH before every watering session.",
  },
];
const tipIndex = ref(Math.floor(Math.random() * tips.length));
const currentTip = computed(() => tips[tipIndex.value]);
function nextTip() {
  tipIndex.value = (tipIndex.value + 1) % tips.length;
}

// Reload on plant changes
function onPlantsUpdated() {
  loadPlantsFromStorage();
}
onMounted(() => {
  loadPlantsFromStorage();
  if (typeof window !== "undefined") {
    window.addEventListener("plants-updated", onPlantsUpdated);
  }
});
onUnmounted(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("plants-updated", onPlantsUpdated);
  }
});
</script>

<template>
  <div class="home-page">
    <!-- ── Hero / Date Banner ─────────────────────────────── -->
    <div class="hero-banner">
      <div class="hero-glow"></div>
      <div class="hero-content">
        <div class="hero-greeting">
          <Icon icon="tabler:leaf" :height="22" class="hero-leaf" />
          <span>Good growing!</span>
        </div>
        <div class="hero-date-block">
          <div class="hero-day">{{ todayName }}</div>
          <div class="hero-full-date">{{ todayDate }}</div>
        </div>
        <div class="hero-badges">
          <div class="hero-badge green">
            <Icon icon="tabler:plant-2" :height="14" />
            <span
              >{{ totalActivePlants }} active plant{{
                totalActivePlants !== 1 ? "s" : ""
              }}</span
            >
          </div>
          <div
            class="hero-badge"
            :class="taskProgress === 100 ? 'gold' : 'neutral'"
          >
            <Icon icon="tabler:checks" :height="14" />
            <span>{{ completedTasks }}/{{ totalTasks }} tasks</span>
          </div>
        </div>
      </div>
    </div>

    <div class="page-body">
      <!-- ── Quick Stats ──────────────────────────────────── -->
      <section class="section">
        <div class="stats-row">
          <div class="stat-pill">
            <div class="stat-pill-icon green">
              <Icon icon="tabler:plant-2" :height="20" />
            </div>
            <div>
              <div class="stat-pill-value">{{ totalActivePlants }}</div>
              <div class="stat-pill-label">Plants</div>
            </div>
          </div>

          <div class="stat-pill">
            <div class="stat-pill-icon blue">
              <Icon icon="tabler:calendar" :height="20" />
            </div>
            <div>
              <div class="stat-pill-value">{{ totalDaysGrowing }}</div>
              <div class="stat-pill-label">Total days</div>
            </div>
          </div>

          <div class="stat-pill">
            <div
              class="stat-pill-icon"
              :style="{ background: getHealthColor(avgHealth) + '22' }"
            >
              <Icon
                icon="tabler:heart-filled"
                :height="20"
                :style="{ color: getHealthColor(avgHealth) }"
              />
            </div>
            <div>
              <div class="stat-pill-value">{{ avgHealth }}%</div>
              <div class="stat-pill-label">Avg health</div>
            </div>
          </div>

          <div class="stat-pill">
            <div class="stat-pill-icon yellow">
              <Icon icon="tabler:check" :height="20" />
            </div>
            <div>
              <div class="stat-pill-value">{{ taskProgress }}%</div>
              <div class="stat-pill-label">Done today</div>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Today's Tasks ────────────────────────────────── -->
      <section class="section">
        <div class="section-header">
          <div class="section-title">
            <Icon icon="tabler:checklist" :height="22" />
            <span>Today's Tasks</span>
          </div>
          <button class="add-task-btn" @click="isAddingTask = !isAddingTask">
            <Icon
              :icon="isAddingTask ? 'tabler:x' : 'tabler:plus'"
              :height="18"
            />
          </button>
        </div>

        <!-- Add task input -->
        <div v-if="isAddingTask" class="add-task-row">
          <input
            v-model="newTaskText"
            type="text"
            placeholder="Add a task for today..."
            class="task-input"
            @keyup.enter="addTask"
            autofocus
          />
          <button
            class="task-save-btn"
            @click="addTask"
            :disabled="!newTaskText.trim()"
          >
            <Icon icon="tabler:check" :height="18" />
          </button>
        </div>

        <!-- Task progress bar -->
        <div v-if="totalTasks > 0" class="task-progress-bar">
          <div
            class="task-progress-fill"
            :style="{ width: taskProgress + '%' }"
          ></div>
        </div>

        <!-- Empty state -->
        <div
          v-if="globalTasks.length === 0 && !isAddingTask"
          class="tasks-empty"
        >
          <Icon icon="tabler:clipboard-list" :height="36" />
          <span>No tasks for today. Tap + to add one!</span>
        </div>

        <!-- Task list -->
        <div v-else class="tasks-list">
          <div
            v-for="task in globalTasks"
            :key="task.id"
            class="task-row"
            :class="{ done: task.done }"
          >
            <button
              class="task-check"
              :class="{ checked: task.done }"
              @click="toggleTask(task.id, !task.done)"
            >
              <Icon v-if="task.done" icon="tabler:check" :height="14" />
            </button>
            <span class="task-label">{{ task.label }}</span>
            <button class="task-delete" @click="removeTask(task.id)">
              <Icon icon="tabler:trash" :height="14" />
            </button>
          </div>
        </div>
      </section>

      <!-- ── Active Plants ─────────────────────────────────── -->
      <section class="section">
        <div class="section-header">
          <div class="section-title">
            <Icon icon="tabler:leaf" :height="22" />
            <span>Active Plants</span>
          </div>
          <NuxtLink to="/my-trees" class="section-link">
            View all
            <Icon icon="tabler:chevron-right" :height="16" />
          </NuxtLink>
        </div>

        <!-- Empty state -->
        <div v-if="activePlants.length === 0" class="plants-empty">
          <Icon icon="tabler:plant-off" :height="48" />
          <p>No plants yet</p>
          <NuxtLink to="/my-trees" class="empty-cta">
            <Icon icon="tabler:plus" :height="16" />
            Add your first plant
          </NuxtLink>
        </div>

        <!-- Plant cards -->
        <div v-else class="plants-scroll">
          <NuxtLink
            v-for="plant in activePlants"
            :key="plant.id"
            :to="`/my_trees/${plant.id}`"
            class="plant-card"
          >
            <!-- Plant image / placeholder -->
            <div class="plant-card-image">
              <img
                v-if="plant.photoPreview"
                :src="plant.photoPreview"
                :alt="plant.name"
              />
              <div v-else class="plant-card-placeholder">
                <Icon
                  :icon="getStageIcon((plant as any).stage || 'Seedling')"
                  :height="32"
                />
              </div>

              <!-- Stage chip -->
              <div
                class="stage-chip"
                :style="{
                  background:
                    getStageColor((plant as any).stage || 'Seedling') + '22',
                  color: getStageColor((plant as any).stage || 'Seedling'),
                  borderColor:
                    getStageColor((plant as any).stage || 'Seedling') + '55',
                }"
              >
                <Icon
                  :icon="getStageIcon((plant as any).stage || 'Seedling')"
                  :height="11"
                />
                <span>{{ (plant as any).stage || "Seedling" }}</span>
              </div>
            </div>

            <!-- Card body -->
            <div class="plant-card-body">
              <div class="plant-card-name">{{ plant.name || "Unnamed" }}</div>
              <div class="plant-card-strain">
                {{ plant.strain || "Unknown strain" }}
              </div>

              <!-- Day progress -->
              <div class="plant-day-info">
                <span class="plant-day-num"
                  >Day
                  {{
                    getDaysSince((plant as any).plantingDate || plant.createdAt)
                  }}</span
                >
                <span class="plant-day-total"
                  >/ {{ getStageDays((plant as any).stage || "Seedling") }}d
                  phase</span
                >
              </div>

              <div class="plant-mini-progress">
                <div
                  class="plant-mini-fill"
                  :style="{
                    width:
                      Math.min(
                        100,
                        (getDaysSince(
                          (plant as any).plantingDate || plant.createdAt,
                        ) /
                          getStageDays((plant as any).stage || 'Seedling')) *
                          100,
                      ) + '%',
                    background: getStageColor(
                      (plant as any).stage || 'Seedling',
                    ),
                  }"
                ></div>
              </div>

              <!-- Health -->
              <div class="plant-health">
                <Icon
                  :icon="getHealthIcon((plant as any).health ?? 100)"
                  :height="13"
                  :style="{
                    color: getHealthColor((plant as any).health ?? 100),
                  }"
                />
                <span
                  :style="{
                    color: getHealthColor((plant as any).health ?? 100),
                  }"
                >
                  {{ (plant as any).health ?? 100 }}%
                </span>
              </div>
            </div>
          </NuxtLink>
        </div>
      </section>

      <!-- ── Quick Actions ─────────────────────────────────── -->
      <section class="section">
        <div class="section-title" style="margin-bottom: 14px">
          <Icon icon="tabler:bolt" :height="22" />
          <span>Quick Actions</span>
        </div>

        <div class="quick-actions-grid">
          <NuxtLink to="/my-trees" class="qa-btn">
            <div class="qa-icon" style="background: rgba(123, 199, 77, 0.15)">
              <Icon icon="tabler:plant-2" :height="26" style="color: #7bc74d" />
            </div>
            <span>My Plants</span>
          </NuxtLink>

          <NuxtLink to="/ai-assistant" class="qa-btn">
            <div class="qa-icon" style="background: rgba(79, 195, 247, 0.15)">
              <Icon icon="tabler:brain" :height="26" style="color: #4fc3f7" />
            </div>
            <span>AI Help</span>
          </NuxtLink>

          <NuxtLink to="/nutriens-calc" class="qa-btn">
            <div class="qa-icon" style="background: rgba(255, 170, 0, 0.15)">
              <Icon
                icon="solar:calculator-broken"
                :height="26"
                style="color: #ffaa00"
              />
            </div>
            <span>Nutrients</span>
          </NuxtLink>

          <NuxtLink to="/stats" class="qa-btn">
            <div class="qa-icon" style="background: rgba(167, 139, 250, 0.15)">
              <Icon
                icon="tabler:chart-bar"
                :height="26"
                style="color: #a78bfa"
              />
            </div>
            <span>Stats</span>
          </NuxtLink>
        </div>
      </section>

      <!-- ── Grow Tip ──────────────────────────────────────── -->
      <section class="section tip-section" @click="nextTip">
        <div class="tip-header">
          <div class="tip-title">
            <Icon icon="tabler:bulb" :height="18" style="color: #ffaa00" />
            <span>Grow Tip</span>
          </div>
          <span class="tip-tap">Tap for next</span>
        </div>
        <div class="tip-body">
          <Icon :icon="currentTip.icon" :height="28" class="tip-icon" />
          <p class="tip-text">{{ currentTip.text }}</p>
        </div>
      </section>
    </div>
    <!-- /page-body -->
  </div>
</template>

<style scoped>
/* ── Base ───────────────────────────────────────────── */
.home-page {
  width: 100%;
  min-height: 100vh;
  background: #0a0a0a;
  padding-bottom: calc(100px + env(safe-area-inset-bottom));
}

/* ── Hero Banner ───────────────────────────────────── */
.hero-banner {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #0d1a0a 0%, #101810 40%, #0a0a0a 100%);
  border-bottom: 1px solid rgba(123, 199, 77, 0.15);
  padding: max(env(safe-area-inset-top), 16px) 20px 24px;
}

.hero-glow {
  position: absolute;
  top: -60px;
  right: -40px;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(123, 199, 77, 0.18) 0%,
    transparent 70%
  );
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-greeting {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #7bc74d;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 8px;
}

.hero-leaf {
  animation: sway 3s ease-in-out infinite;
}

@keyframes sway {
  0%,
  100% {
    transform: rotate(-8deg);
  }
  50% {
    transform: rotate(8deg);
  }
}

.hero-day {
  font-size: 34px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
  line-height: 1;
  margin-bottom: 4px;
}

.hero-full-date {
  font-size: 14px;
  color: #888;
  font-weight: 500;
  margin-bottom: 16px;
}

.hero-badges {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.hero-badge.green {
  background: rgba(123, 199, 77, 0.15);
  color: #7bc74d;
  border: 1px solid rgba(123, 199, 77, 0.3);
}

.hero-badge.neutral {
  background: rgba(255, 255, 255, 0.06);
  color: #aaa;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.hero-badge.gold {
  background: rgba(255, 215, 0, 0.15);
  color: #ffd700;
  border: 1px solid rgba(255, 215, 0, 0.3);
}

/* ── Page body ─────────────────────────────────────── */
.page-body {
  padding: 20px 16px 0;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* ── Section layout ────────────────────────────────── */
.section {
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}

.section-link {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  font-weight: 600;
  color: #7bc74d;
  text-decoration: none;
}

/* ── Stats row ────────────────────────────────────── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 14px 8px;
  background: linear-gradient(
    135deg,
    rgba(30, 30, 30, 0.9) 0%,
    rgba(20, 20, 20, 0.9) 100%
  );
  border: 1px solid rgba(123, 199, 77, 0.12);
  border-radius: 16px;
  text-align: center;
}

.stat-pill-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-pill-icon.green {
  background: rgba(123, 199, 77, 0.15);
  color: #7bc74d;
}

.stat-pill-icon.blue {
  background: rgba(79, 195, 247, 0.15);
  color: #4fc3f7;
}

.stat-pill-icon.yellow {
  background: rgba(255, 170, 0, 0.15);
  color: #ffaa00;
}

.stat-pill-value {
  font-size: 18px;
  font-weight: 800;
  color: #fff;
  line-height: 1;
}

.stat-pill-label {
  font-size: 10px;
  color: #777;
  font-weight: 500;
  margin-top: 2px;
}

/* ── Tasks ────────────────────────────────────────── */
.add-task-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(123, 199, 77, 0.12);
  border: 1px solid rgba(123, 199, 77, 0.25);
  color: #7bc74d;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.add-task-btn:active {
  transform: scale(0.9);
}

.add-task-row {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.task-input {
  flex: 1;
  padding: 12px 14px;
  background: rgba(30, 30, 30, 0.9);
  border: 1px solid rgba(123, 199, 77, 0.25);
  border-radius: 12px;
  color: #fff;
  font-size: 14px;
  outline: none;
}

.task-input::placeholder {
  color: #555;
}
.task-input:focus {
  border-color: rgba(123, 199, 77, 0.5);
}

.task-save-btn {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #7bc74d, #5a9e3a);
  border: none;
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: 700;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.task-save-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.task-save-btn:active {
  transform: scale(0.92);
}

.task-progress-bar {
  height: 4px;
  background: rgba(123, 199, 77, 0.12);
  border-radius: 100px;
  margin-bottom: 12px;
  overflow: hidden;
}

.task-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #5a9e3a, #9fe76d);
  border-radius: 100px;
  transition: width 0.4s ease;
}

.tasks-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 30px;
  color: #555;
  font-size: 13px;
  text-align: center;
  background: rgba(30, 30, 30, 0.5);
  border: 1px dashed rgba(123, 199, 77, 0.15);
  border-radius: 16px;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: linear-gradient(
    135deg,
    rgba(30, 30, 30, 0.9) 0%,
    rgba(20, 20, 20, 0.9) 100%
  );
  border: 1px solid rgba(123, 199, 77, 0.12);
  border-radius: 14px;
  transition: all 0.2s;
}

.task-row.done {
  opacity: 0.6;
  border-color: rgba(123, 199, 77, 0.2);
}

.task-check {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 8px;
  border: 2px solid rgba(123, 199, 77, 0.4);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.task-check.checked {
  background: linear-gradient(135deg, #7bc74d, #5a9e3a);
  border-color: #7bc74d;
}

.task-label {
  flex: 1;
  font-size: 14px;
  color: #e5e7eb;
  font-weight: 500;
}

.task-row.done .task-label {
  text-decoration: line-through;
  color: #777;
}

.task-delete {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: transparent;
  border: none;
  color: #555;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.task-delete:active {
  color: #ff4444;
}

/* ── Plant cards (horizontal scroll) ─────────────── */
.plants-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 36px;
  color: #555;
  text-align: center;
  background: rgba(30, 30, 30, 0.5);
  border: 1px dashed rgba(123, 199, 77, 0.15);
  border-radius: 16px;
}

.plants-empty p {
  margin: 0;
  font-size: 15px;
}

.empty-cta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  padding: 10px 18px;
  background: rgba(123, 199, 77, 0.12);
  border: 1px solid rgba(123, 199, 77, 0.3);
  border-radius: 12px;
  color: #7bc74d;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.plants-scroll {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 6px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.plants-scroll::-webkit-scrollbar {
  display: none;
}

.plant-card {
  flex-shrink: 0;
  width: 160px;
  background: linear-gradient(
    135deg,
    rgba(30, 30, 30, 0.95) 0%,
    rgba(18, 18, 18, 0.95) 100%
  );
  border: 1px solid rgba(123, 199, 77, 0.15);
  border-radius: 20px;
  overflow: hidden;
  text-decoration: none;
  transition: all 0.25s ease;
  -webkit-tap-highlight-color: transparent;
}

.plant-card:active {
  transform: scale(0.96);
  border-color: rgba(123, 199, 77, 0.35);
}

.plant-card-image {
  position: relative;
  height: 120px;
  background: rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.plant-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.plant-card-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7bc74d;
  background: rgba(123, 199, 77, 0.06);
}

.stage-chip {
  position: absolute;
  top: 8px;
  left: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 20px;
  border: 1px solid;
  font-size: 10px;
  font-weight: 700;
  backdrop-filter: blur(6px);
}

.plant-card-body {
  padding: 12px;
}

.plant-card-name {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.plant-card-strain {
  font-size: 11px;
  color: #888;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 10px;
}

.plant-day-info {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 6px;
}

.plant-day-num {
  font-size: 13px;
  font-weight: 700;
  color: #fff;
}

.plant-day-total {
  font-size: 10px;
  color: #666;
}

.plant-mini-progress {
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 100px;
  overflow: hidden;
  margin-bottom: 8px;
}

.plant-mini-fill {
  height: 100%;
  border-radius: 100px;
  transition: width 0.4s ease;
  min-width: 4px;
}

.plant-health {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
}

/* ── Quick Actions grid ────────────────────────────── */
.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.qa-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 6px;
  background: linear-gradient(
    135deg,
    rgba(30, 30, 30, 0.9) 0%,
    rgba(20, 20, 20, 0.9) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  text-decoration: none;
  color: #ccc;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  transition: all 0.25s ease;
  -webkit-tap-highlight-color: transparent;
}

.qa-btn:active {
  transform: scale(0.94);
  border-color: rgba(123, 199, 77, 0.3);
}

.qa-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Grow Tip ──────────────────────────────────────── */
.tip-section {
  background: linear-gradient(
    135deg,
    rgba(255, 170, 0, 0.06) 0%,
    rgba(30, 30, 30, 0.9) 100%
  );
  border: 1px solid rgba(255, 170, 0, 0.2);
  border-radius: 20px;
  padding: 18px;
  cursor: pointer;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.tip-section:active {
  transform: scale(0.99);
}

.tip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.tip-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tip-tap {
  font-size: 11px;
  color: #666;
  font-style: italic;
}

.tip-body {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.tip-icon {
  flex-shrink: 0;
  color: #ffaa00;
  margin-top: 2px;
}

.tip-text {
  font-size: 14px;
  line-height: 1.6;
  color: #ccc;
  margin: 0;
}
</style>
