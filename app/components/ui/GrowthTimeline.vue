<template>
  <div class="growth-timeline">
    <h3 class="timeline-title">Časová osa růstu</h3>

    <div class="timeline">
      <div
        v-for="(stage, index) in stages"
        :key="index"
        :class="['timeline-item', {
          active: index === currentStageIndex,
          completed: index < currentStageIndex,
          upcoming: index > currentStageIndex
        }]"
      >
        <div class="timeline-marker">
          <div class="marker-dot">
            <Icon v-if="index < currentStageIndex" icon="tabler:check" height="16" />
            <Icon v-else-if="index === currentStageIndex" icon="tabler:loader" height="16" class="rotating" />
            <Icon v-else :icon="stage.icon" height="16" />
          </div>
          <div v-if="index < stages.length - 1" class="marker-line"></div>
        </div>

        <div class="timeline-content">
          <div class="stage-header">
            <div class="stage-icon">
              <Icon :icon="stage.icon" height="24" />
            </div>
            <div class="stage-info">
              <div class="stage-name">{{ stage.name }}</div>
              <div class="stage-duration">{{ stage.duration }}</div>
            </div>
            <div v-if="index === currentStageIndex" class="stage-badge">
              Probíhá
            </div>
          </div>

          <div v-if="index === currentStageIndex" class="stage-progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: stageProgress + '%' }"></div>
            </div>
            <div class="progress-text">
              <span>Den {{ currentDay }}</span>
              <span>{{ stageProgress }}%</span>
            </div>
          </div>

          <div class="stage-description">{{ stage.description }}</div>

          <div v-if="stage.tips && stage.tips.length > 0" class="stage-tips">
            <div class="tip" v-for="(tip, tipIndex) in stage.tips" :key="tipIndex">
              <Icon icon="tabler:bulb" height="14" />
              <span>{{ tip }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from "@iconify/vue";

interface Stage {
  name: string;
  icon: string;
  duration: string;
  days: number;
  description: string;
  tips?: string[];
}

const props = defineProps<{
  currentDay: number;
}>();

const stages: Stage[] = [
  {
    name: 'Klíčení',
    icon: 'tabler:seeding',
    duration: '1-7 dní',
    days: 7,
    description: 'Semínko klíčí a vytváří první kořínky a listy.',
    tips: [
      'Udržuj vlhkost 70-90%',
      'Teplota 22-25°C',
      'Minimální světlo'
    ]
  },
  {
    name: 'Sazenice',
    icon: 'tabler:plant',
    duration: '2-3 týdny',
    days: 21,
    description: 'Rostlina vytváří první pravé listy a posiluje kořenový systém.',
    tips: [
      'Světlo 18/6 hodin',
      'Jemné hnojení',
      'Pozor na přelití'
    ]
  },
  {
    name: 'Vegetace',
    icon: 'tabler:tree',
    duration: '3-16 týdnů',
    days: 56,
    description: 'Rychlý růst vegetativní hmoty, tvorba větví a listů.',
    tips: [
      'Více dusíku (N)',
      'Trénink a ořez',
      'Silné osvětlení'
    ]
  },
  {
    name: 'Předkvět',
    icon: 'tabler:flower',
    duration: '1-2 týdny',
    days: 14,
    description: 'Přechod na květení, začínají se tvořit první pistily.',
    tips: [
      'Změna na 12/12',
      'Snížit dusík',
      'Zvýšit fosfor (P)'
    ]
  },
  {
    name: 'Květení',
    icon: 'tabler:cannabis',
    duration: '6-12 týdnů',
    days: 63,
    description: 'Tvorba květů a pryskyřice, hlavní produkční fáze.',
    tips: [
      'Více fosforu a draslíku',
      'Kontrola vlhkosti',
      'Sleduj trichomy'
    ]
  },
  {
    name: 'Zrání',
    icon: 'tabler:adjustments',
    duration: '1-2 týdny',
    days: 14,
    description: 'Finální dozrávání, propláchnutí před sklizní.',
    tips: [
      'Proplach čistou vodou',
      'Sleduj trichomy',
      'Příprava na sklizeň'
    ]
  }
];

const currentStageIndex = computed(() => {
  let totalDays = 0;
  for (let i = 0; i < stages.length; i++) {
    totalDays += stages[i]?.days ?? 0;
    if (props.currentDay <= totalDays) {
      return i;
    }
  }
  return stages.length - 1;
});

const currentStage = computed(() => stages[currentStageIndex.value]);

const daysIntoCurrentStage = computed(() => {
  let totalDays = 0;
  for (let i = 0; i < currentStageIndex.value; i++) {
    totalDays += stages[i]?.days ?? 0;
  }
  return props.currentDay - totalDays;
});

const stageProgress = computed(() => {
  if (!currentStage.value) return 0;
  return Math.min(Math.round((daysIntoCurrentStage.value / currentStage.value.days) * 100), 100);
});
</script>

<style scoped>
.growth-timeline {
  background: linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%);
  border: 1px solid rgba(123, 199, 77, 0.2);
  border-radius: 20px;
  padding: 24px;
}

.timeline-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 24px 0;
  letter-spacing: -0.01em;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.timeline-item {
  display: flex;
  gap: 16px;
  position: relative;
}

.timeline-marker {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 40px;
}

.marker-dot {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(123, 199, 77, 0.15);
  border: 2px solid rgba(123, 199, 77, 0.3);
  color: #7bc74d;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.timeline-item.completed .marker-dot {
  background: linear-gradient(135deg, #7bc74d 0%, #5a9e3a 100%);
  border-color: #7bc74d;
  color: #fff;
}

.timeline-item.active .marker-dot {
  background: linear-gradient(135deg, #7bc74d 0%, #5a9e3a 100%);
  border-color: #7bc74d;
  color: #fff;
  box-shadow: 0 0 20px rgba(123, 199, 77, 0.5);
  animation: pulse-marker 2s ease-in-out infinite;
}

.timeline-item.upcoming .marker-dot {
  opacity: 0.5;
  background: rgba(50, 50, 50, 0.5);
  border-color: rgba(100, 100, 100, 0.3);
  color: #666;
}

@keyframes pulse-marker {
  0%, 100% {
    box-shadow: 0 0 20px rgba(123, 199, 77, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(123, 199, 77, 0.6);
  }
}

.rotating {
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.marker-line {
  flex: 1;
  width: 2px;
  background: rgba(123, 199, 77, 0.2);
  margin: 4px 0;
  min-height: 60px;
}

.timeline-item.completed .marker-line {
  background: linear-gradient(180deg, #7bc74d 0%, rgba(123, 199, 77, 0.3) 100%);
}

.timeline-item.upcoming .marker-line {
  background: rgba(100, 100, 100, 0.2);
}

.timeline-content {
  flex: 1;
  padding-bottom: 28px;
}

.timeline-item:last-child .timeline-content {
  padding-bottom: 0;
}

.stage-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.stage-icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(123, 199, 77, 0.15);
  border: 1px solid rgba(123, 199, 77, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #7bc74d;
}

.timeline-item.completed .stage-icon {
  background: rgba(123, 199, 77, 0.2);
  border-color: rgba(123, 199, 77, 0.3);
}

.timeline-item.upcoming .stage-icon {
  opacity: 0.5;
  background: rgba(50, 50, 50, 0.5);
  border-color: rgba(100, 100, 100, 0.3);
  color: #666;
}

.stage-info {
  flex: 1;
  min-width: 0;
}

.stage-name {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 2px;
}

.timeline-item.upcoming .stage-name {
  color: #999;
}

.stage-duration {
  font-size: 12px;
  color: #999;
}

.stage-badge {
  flex-shrink: 0;
  padding: 4px 12px;
  background: linear-gradient(135deg, #7bc74d 0%, #5a9e3a 100%);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  animation: pulse-badge 2s ease-in-out infinite;
}

@keyframes pulse-badge {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.stage-progress {
  margin-bottom: 12px;
}

.progress-bar {
  height: 8px;
  background: rgba(123, 199, 77, 0.1);
  border-radius: 100px;
  overflow: hidden;
  margin-bottom: 6px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #5a9e3a 0%, #7bc74d 50%, #9fe76d 100%);
  border-radius: 100px;
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.progress-text {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #999;
  font-weight: 600;
}

.stage-description {
  font-size: 14px;
  color: #bbb;
  line-height: 1.5;
  margin-bottom: 12px;
}

.timeline-item.upcoming .stage-description {
  color: #777;
}

.stage-tips {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tip {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #7bc74d;
  padding: 6px 12px;
  background: rgba(123, 199, 77, 0.08);
  border-left: 2px solid #7bc74d;
  border-radius: 0 8px 8px 0;
}

.timeline-item.upcoming .tip {
  color: #666;
  background: rgba(100, 100, 100, 0.1);
  border-left-color: #666;
}
</style>

