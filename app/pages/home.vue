<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { Icon } from "@iconify/vue";
import StatsCard from "~/components/ui/StatsCard.vue";
import QuickAction from "~/components/ui/QuickAction.vue";
import GrowthProgress from "~/components/ui/GrowthProgress.vue";

// Simulated data - load from API/storage in production
const userName = ref('Grower');
const activePlants = ref(3);
const totalHarvest = ref(245); // in grams
const daysUntilHarvest = ref(42);

const plants = ref([
  {
    id: 1,
    name: 'Northern Lights #1',
    stage: 'Flowering',
    stageIcon: 'tabler:flower',
    day: 35,
    totalDays: 63,
    health: 95,
    image: '/flowering.png'
  },
  {
    id: 2,
    name: 'AK-47 #1',
    stage: 'Vegetative',
    stageIcon: 'tabler:plant',
    day: 21,
    totalDays: 45,
    health: 88,
    image: '/vegetative.png'
  },
  {
    id: 3,
    name: 'White Widow #1',
    stage: 'Seedling',
    stageIcon: 'tabler:seeding',
    day: 8,
    totalDays: 14,
    health: 92,
    image: '/seedling.png'
  }
]);

const greetingMessage = computed(() => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
});

const todayTasks = ref<Array<{id: number, text: string, done: boolean, priority: string}>>([]);

const pendingTasks = computed(() => todayTasks.value.filter(t => !t.done).length);

const toggleTask = (taskId: number) => {
  const task = todayTasks.value.find(t => t.id === taskId);
  if (task) {
    task.done = !task.done;
    saveTasks();
  }
};

const loadTasks = () => {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('budbuddy-tasks');
      if (stored) {
        const tasks = JSON.parse(stored);
        const today = new Date().toISOString().split('T')[0];
        todayTasks.value = tasks.filter((t: any) => t.date === today || !t.date);
      }
    } catch (e) {
      console.error('Error loading tasks:', e);
    }
  }
};

const saveTasks = () => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('budbuddy-tasks', JSON.stringify(todayTasks.value));
    } catch (e) {
      console.error('Error saving tasks:', e);
    }
  }
};

onMounted(() => {
  loadTasks();
});
</script>

<template>
  <div class="home-page">
    <!-- Hero section -->
    <div class="hero-section">
      <div class="hero-background"></div>
      <div class="hero-content">
        <div class="greeting">
          <h1>{{ greetingMessage }}, {{ userName }}! 👋</h1>
          <p>Your plants are growing great</p>
        </div>
        <div class="hero-stats">
          <div class="hero-stat">
            <Icon icon="tabler:plant" :height="24" style="color: #7bc74d" />
            <div>
              <div class="stat-value">{{ activePlants }}</div>
              <div class="stat-label">Active plants</div>
            </div>
          </div>
          <div class="hero-stat">
            <Icon icon="tabler:calendar-clock" :height="24" style="color: #7bc74d" />
            <div>
              <div class="stat-value">{{ daysUntilHarvest }}</div>
              <div class="stat-label">Days to harvest</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="content-wrapper">
      <!-- Quick Actions -->
      <section class="section">
        <h2 class="section-title">Quick Actions</h2>
        <div class="quick-actions-grid">
          <QuickAction
            icon="tabler:brain"
            label="AI Assistant"
            to="/ai-assistant"
            icon-color="#7bc74d"
          />
          <QuickAction
            icon="tabler:camera"
            label="Add Record"
            to="/"
            icon-color="#5a9e3a"
          />
          <QuickAction
            icon="solar:calculator-broken"
            label="Calculator"
            to="/nutriens-calc"
            icon-color="#7bc74d"
          />
          <QuickAction
            icon="tabler:chart-bar"
            label="Statistics"
            to="/stats"
            icon-color="#5a9e3a"
          />
        </div>
      </section>

      <!-- Statistics -->
      <section class="section">
        <h2 class="section-title">Overview</h2>
        <div class="stats-grid">
          <StatsCard
            icon="tabler:scale"
            label="Total Harvest"
            :value="totalHarvest + ' g'"
            subtitle="From last 3 harvests"
          />
          <StatsCard
            icon="tabler:droplet"
            label="Soil Moisture"
            value="65%"
            subtitle="Optimal state"
            icon-color="#4a9eff"
            icon-bg="rgba(74, 158, 255, 0.15)"
          />
        </div>
      </section>

      <!-- Today's tasks -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">Today's Tasks</h2>
          <div v-if="pendingTasks > 0" class="task-badge">{{ pendingTasks }}</div>
        </div>

        <div v-if="todayTasks.length === 0" class="tasks-empty">
          <Icon icon="tabler:clipboard-check" :height="48" style="color: #666" />
          <p>No tasks for today</p>
        </div>

        <div v-else class="tasks-list">
          <div
            v-for="task in todayTasks"
            :key="task.id"
            :class="['task-item', { done: task.done }]"
            @click="toggleTask(task.id)"
          >
            <div class="task-checkbox">
              <Icon v-if="task.done" icon="tabler:check" :height="18" />
            </div>
            <div class="task-text">{{ task.text }}</div>
            <div :class="['task-priority', task.priority]"></div>
          </div>
        </div>
      </section>

      <!-- My plants -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">My Plants</h2>
          <NuxtLink to="/my-trees" class="see-all">
            View all
            <Icon icon="tabler:chevron-right" :height="16" />
          </NuxtLink>
        </div>

        <div class="plants-list">
          <NuxtLink
            v-for="plant in plants"
            :key="plant.id"
            :to="`/my_trees/${plant.id}`"
            class="plant-card"
          >
            <div class="plant-image">
              <img :src="plant.image" :alt="plant.name" />
              <div class="plant-health">
                <Icon icon="tabler:heart-filled" :height="14" />
                <span>{{ plant.health }}%</span>
              </div>
            </div>

            <div class="plant-info">
              <div class="plant-header">
                <h3 class="plant-name">{{ plant.name }}</h3>
                <div class="plant-stage">
                  <Icon :icon="plant.stageIcon" :height="16" />
                  <span>{{ plant.stage }}</span>
                </div>
              </div>

              <GrowthProgress
                :stage-name="plant.stage"
                :stage-icon="plant.stageIcon"
                :current-day="plant.day"
                :total-days="plant.totalDays"
              />
            </div>
          </NuxtLink>
        </div>
      </section>

      <!-- Tips and advice -->
      <section class="section">
        <h2 class="section-title">💡 Tip of the Day</h2>
        <div class="tip-card">
          <div class="tip-icon">
            <Icon icon="tabler:bulb-filled" :height="32" style="color: #ffd700" />
          </div>
          <div class="tip-content">
            <h3>Optimal temperature for flowering</h3>
            <p>During flowering, maintain temperature between 20-26°C during the day and 18-22°C at night. Too high temperatures can reduce resin production.</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  width: 100%;
  background: #0a0a0a;
}

.hero-section {
  position: relative;
  padding: 24px 20px 32px;
  margin-bottom: 20px;
  overflow: hidden;
}

.hero-background {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(123, 199, 77, 0.15) 0%, rgba(90, 158, 58, 0.1) 100%);
  border-radius: 0 0 32px 32px;
}

.hero-background::before {
  content: '';
  position: absolute;
  inset: 0;
  background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="rgba(123,199,77,0.03)"/></svg>');
  background-size: 100px 100px;
  opacity: 0.5;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.greeting h1 {
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.greeting p {
  font-size: 15px;
  color: #7bc74d;
  font-weight: 500;
}

.hero-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 24px;
}

.hero-stat {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(20, 20, 20, 0.8);
  border: 1px solid rgba(123, 199, 77, 0.2);
  border-radius: 16px;
  backdrop-filter: blur(10px);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 11px;
  color: #999;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.content-wrapper {
  padding: 0 16px;
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.task-badge {
  background: linear-gradient(135deg, #ff4444 0%, #cc0000 100%);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 12px;
  min-width: 24px;
  text-align: center;
}

.see-all {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #7bc74d;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
}

.see-all:active {
  opacity: 0.7;
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tasks-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.5) 0%, rgba(20, 20, 20, 0.5) 100%);
  border: 1px dashed rgba(123, 199, 77, 0.15);
  border-radius: 18px;
}

.tasks-empty p {
  font-size: 15px;
  color: #999;
  margin: 12px 0 0 0;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(20, 20, 20, 0.9) 100%);
  border: 1px solid rgba(123, 199, 77, 0.15);
  border-radius: 14px;
  transition: all 0.2s ease;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.task-item:active {
  transform: scale(0.98);
}

.task-item.done {
  opacity: 0.6;
  border-color: rgba(123, 199, 77, 0.3);
}

.task-item.done .task-text {
  text-decoration: line-through;
  color: #666;
}

.task-checkbox {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: 2px solid #7bc74d;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7bc74d;
  transition: all 0.2s ease;
}

.task-item.done .task-checkbox {
  background: #7bc74d;
  color: #fff;
}

.task-text {
  flex: 1;
  font-size: 15px;
  color: #fff;
  font-weight: 500;
}

.task-priority {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.task-priority.high {
  background: #ff4444;
  box-shadow: 0 0 8px rgba(255, 68, 68, 0.6);
}

.task-priority.medium {
  background: #ffaa00;
  box-shadow: 0 0 8px rgba(255, 170, 0, 0.6);
}

.task-priority.low {
  background: #4a9eff;
  box-shadow: 0 0 8px rgba(74, 158, 255, 0.6);
}

.plants-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plant-card {
  display: flex;
  gap: 14px;
  padding: 14px;
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(20, 20, 20, 0.9) 100%);
  border: 1px solid rgba(123, 199, 77, 0.15);
  border-radius: 18px;
  text-decoration: none;
  transition: all 0.3s ease;
  -webkit-tap-highlight-color: transparent;
}

.plant-card:active {
  transform: scale(0.98);
  border-color: rgba(123, 199, 77, 0.3);
}

.plant-image {
  position: relative;
  flex-shrink: 0;
  width: 90px;
  height: 90px;
  border-radius: 14px;
  overflow: hidden;
  background: rgba(123, 199, 77, 0.1);
}

.plant-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.plant-health {
  position: absolute;
  top: 6px;
  right: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  color: #7bc74d;
}

.plant-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.plant-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.plant-name {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.plant-stage {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(123, 199, 77, 0.15);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #7bc74d;
}

.tip-card {
  display: flex;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 193, 7, 0.05) 100%);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 18px;
}

.tip-icon {
  flex-shrink: 0;
}

.tip-content h3 {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}

.tip-content p {
  font-size: 14px;
  color: #bbb;
  line-height: 1.6;
  margin: 0;
}
</style>
