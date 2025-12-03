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
            <div class="stat-value">12</div>
            <div class="stat-label">Total grown</div>
          </div>
          <div class="stat-box">
            <Icon icon="tabler:scale" :height="32" class="stat-icon" />
            <div class="stat-value">1.2 kg</div>
            <div class="stat-label">Total harvest</div>
          </div>
          <div class="stat-box">
            <Icon icon="tabler:calendar-check" :height="32" class="stat-icon" />
            <div class="stat-value">245</div>
            <div class="stat-label">Days growing</div>
          </div>
          <div class="stat-box">
            <Icon icon="tabler:award" :height="32" class="stat-icon" />
            <div class="stat-value">92%</div>
            <div class="stat-label">Success rate</div>
          </div>
        </div>
      </section>

      <!-- Harvest chart -->
      <section class="section">
        <h2 class="section-title">Harvest History</h2>
        <div class="chart-container">
          <div class="chart-bars">
            <div class="chart-bar" v-for="(harvest, index) in harvestHistory" :key="index">
              <div class="bar-fill" :style="{ height: (harvest.amount / maxHarvest * 100) + '%' }">
                <div class="bar-value">{{ harvest.amount }}g</div>
              </div>
              <div class="bar-label">{{ harvest.month }}</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Best strains -->
      <section class="section">
        <h2 class="section-title">Best Strains</h2>
        <div class="strains-list">
          <div class="strain-item" v-for="(strain, index) in topStrains" :key="index">
            <div class="strain-rank">{{ index + 1 }}</div>
            <div class="strain-info">
              <div class="strain-name">{{ strain.name }}</div>
              <div class="strain-stats">
                <span>{{ strain.harvests }}x harvest</span>
                <span class="dot">•</span>
                <span>{{ strain.avgYield }}g average</span>
              </div>
            </div>
            <div class="strain-rating">
              <Icon icon="tabler:star-filled" :height="16" style="color: #ffd700" />
              <span>{{ strain.rating }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Achievements -->
      <section class="section">
        <h2 class="section-title">🏆 Achievements</h2>
        <div class="achievements-grid">
          <div class="achievement unlocked">
            <Icon icon="tabler:plant" :height="40" />
            <div class="achievement-name">First harvest</div>
          </div>
          <div class="achievement unlocked">
            <Icon icon="tabler:flame" :height="40" />
            <div class="achievement-name">7 days streak</div>
          </div>
          <div class="achievement unlocked">
            <Icon icon="tabler:trophy" :height="40" />
            <div class="achievement-name">100g harvest</div>
          </div>
          <div class="achievement locked">
            <Icon icon="tabler:crown" :height="40" />
            <div class="achievement-name">Master grower</div>
          </div>
        </div>
      </section>

      <!-- Current trends -->
      <section class="section">
        <h2 class="section-title">📈 Current Trends</h2>
        <div class="trends-list">
          <div class="trend-item positive">
            <Icon icon="tabler:trending-up" :height="24" />
            <div class="trend-info">
              <div class="trend-label">Average harvest</div>
              <div class="trend-value">+15% last month</div>
            </div>
          </div>
          <div class="trend-item positive">
            <Icon icon="tabler:trending-up" :height="24" />
            <div class="trend-info">
              <div class="trend-label">Plant health</div>
              <div class="trend-value">+8% improvement</div>
            </div>
          </div>
          <div class="trend-item neutral">
            <Icon icon="tabler:minus" :height="24" />
            <div class="trend-info">
              <div class="trend-label">Nutrient usage</div>
              <div class="trend-value">Stable</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Icon } from "@iconify/vue";
import Header from "~/components/Header.vue";

const harvestHistory = ref([
  { month: 'Led', amount: 85 },
  { month: 'Úno', amount: 92 },
  { month: 'Bře', amount: 78 },
  { month: 'Dub', amount: 105 },
  { month: 'Kvě', amount: 98 },
  { month: 'Čer', amount: 115 }
]);

const maxHarvest = computed(() => Math.max(...harvestHistory.value.map(h => h.amount)));

const topStrains = ref([
  { name: 'Northern Lights', harvests: 4, avgYield: 105, rating: 4.8 },
  { name: 'AK-47', harvests: 3, avgYield: 98, rating: 4.6 },
  { name: 'White Widow', harvests: 3, avgYield: 92, rating: 4.5 },
  { name: 'OG Kush', harvests: 2, avgYield: 88, rating: 4.4 }
]);
</script>

<style scoped>
.stats-page {
  width: 100%;
  background: #0a0a0a;
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
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(20, 20, 20, 0.9) 100%);
  border: 1px solid rgba(123, 199, 77, 0.15);
  border-radius: 18px;
  text-align: center;
}

.stat-icon {
  color: #7bc74d;
  margin-bottom: 12px;
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
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(20, 20, 20, 0.9) 100%);
  border: 1px solid rgba(123, 199, 77, 0.15);
  border-radius: 18px;
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  justify-content: space-around;
  gap: 8px;
  height: 200px;
}

.chart-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.bar-fill {
  width: 100%;
  background: linear-gradient(180deg, #9fe76d 0%, #7bc74d 50%, #5a9e3a 100%);
  border-radius: 8px 8px 0 0;
  position: relative;
  transition: height 0.5s ease;
  min-height: 20px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 8px;
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
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(20, 20, 20, 0.9) 100%);
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
  font-size: 14px;
  font-weight: 700;
  color: #ffd700;
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
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(20, 20, 20, 0.9) 100%);
  border: 1px solid rgba(123, 199, 77, 0.15);
  border-radius: 16px;
  text-align: center;
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
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.9) 0%, rgba(20, 20, 20, 0.9) 100%);
  border: 1px solid rgba(123, 199, 77, 0.15);
  border-radius: 16px;
}

.trend-item.positive {
  border-color: rgba(123, 199, 77, 0.3);
  color: #7bc74d;
}

.trend-item.neutral {
  border-color: rgba(255, 170, 0, 0.3);
  color: #ffaa00;
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
</style>

