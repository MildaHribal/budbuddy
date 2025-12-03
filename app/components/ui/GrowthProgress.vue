<template>
  <div class="growth-progress">
    <div class="progress-header">
      <div class="progress-title">
        <Icon :icon="stageIcon" height="24" style="color: #7bc74d" />
        <span>{{ stageName }}</span>
      </div>
      <div class="progress-percentage">{{ percentage }}%</div>
    </div>

    <div class="progress-bar-container">
      <div class="progress-bar-bg"></div>
      <div class="progress-bar-fill" :style="{ width: percentage + '%' }">
        <div class="progress-bar-glow"></div>
      </div>
    </div>

    <div class="progress-info">
      <div class="progress-day">Den {{ currentDay }} z {{ totalDays }}</div>
      <div class="progress-remaining">{{ remainingDays }} dní zbývá</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from "@iconify/vue";
import { computed } from 'vue';

const props = defineProps<{
  stageName: string;
  stageIcon: string;
  currentDay: number;
  totalDays: number;
}>();

const percentage = computed(() => {
  return Math.min(Math.round((props.currentDay / props.totalDays) * 100), 100);
});

const remainingDays = computed(() => {
  return Math.max(props.totalDays - props.currentDay, 0);
});
</script>

<style scoped>
.growth-progress {
  padding: 20px;
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%);
  border: 1px solid rgba(123, 199, 77, 0.2);
  border-radius: 20px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.progress-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
}

.progress-percentage {
  font-size: 20px;
  font-weight: 700;
  color: #7bc74d;
}

.progress-bar-container {
  position: relative;
  height: 12px;
  margin-bottom: 14px;
}

.progress-bar-bg {
  position: absolute;
  inset: 0;
  background: rgba(123, 199, 77, 0.1);
  border-radius: 100px;
  overflow: hidden;
}

.progress-bar-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: linear-gradient(90deg, #5a9e3a 0%, #7bc74d 50%, #9fe76d 100%);
  border-radius: 100px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 0 16px rgba(123, 199, 77, 0.5);
  overflow: hidden;
}

.progress-bar-glow {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.3) 50%, transparent 100%);
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.progress-day {
  color: #bbb;
  font-weight: 500;
}

.progress-remaining {
  color: #7bc74d;
  font-weight: 600;
}
</style>

