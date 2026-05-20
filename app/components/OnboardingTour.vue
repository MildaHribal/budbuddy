<template>
  <Transition name="onb-fade">
    <div
      v-if="visible"
      class="onb-overlay"
    >
      <div class="onb-card">
        <button
          class="onb-skip"
          @click="finish"
        >
          Skip
        </button>

        <div
          :key="step"
          class="onb-slide"
        >
          <div
            class="onb-icon"
            :style="{ background: slides[step]!.glow }"
          >
            <Icon
              :icon="slides[step]!.icon"
              :height="56"
              :style="{ color: slides[step]!.color }"
            />
          </div>
          <h2 class="onb-title">
            {{ slides[step]!.title }}
          </h2>
          <p class="onb-text">
            {{ slides[step]!.text }}
          </p>
        </div>

        <div class="onb-dots">
          <span
            v-for="(s, i) in slides"
            :key="i"
            :class="['onb-dot', { active: i === step }]"
            @click="step = i"
          />
        </div>

        <button
          class="onb-next"
          @click="next"
        >
          <span>{{ isLast ? "Start growing 🌱" : "Next" }}</span>
          <Icon
            v-if="!isLast"
            icon="tabler:arrow-right"
            :height="20"
          />
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Icon } from '@iconify/vue'
import { useNativeStorage } from '~/composables/useNativeStorage'

const ONBOARDED_KEY = 'budbuddy-onboarded'

const storage = useNativeStorage()
const visible = ref(false)
const step = ref(0)

const slides = [
  {
    icon: 'tabler:plant-2',
    color: '#7bc74d',
    glow: 'rgba(123, 199, 77, 0.15)',
    title: 'Welcome to BudBuddy 🌿',
    text: 'Your personal grow companion. Track every plant from seed to harvest, all on your device.'
  },
  {
    icon: 'tabler:notebook',
    color: '#7bc74d',
    glow: 'rgba(123, 199, 77, 0.15)',
    title: 'Track your plants',
    text: 'Add your plants, log watering, feeding and notes, and follow each growth stage on a clear timeline.'
  },
  {
    icon: 'tabler:brain',
    color: '#9fe76d',
    glow: 'rgba(159, 231, 109, 0.15)',
    title: 'Ask the AI assistant',
    text: 'Get cultivation tips and diagnose problems from photos. Add a free Gemini key in the AI tab to unlock it.'
  },
  {
    icon: 'tabler:chart-bar',
    color: '#7bc74d',
    glow: 'rgba(123, 199, 77, 0.15)',
    title: 'Gallery & stats',
    text: 'Browse all your grow photos and watch your progress and achievements grow. Follow your local laws. 🌍'
  }
]

const isLast = computed(() => step.value === slides.length - 1)

onMounted(async () => {
  const seen = await storage.getItem(ONBOARDED_KEY)
  if (!seen) visible.value = true
})

const next = () => {
  if (isLast.value) {
    finish()
  } else {
    step.value++
  }
}

const finish = async () => {
  await storage.setItem(ONBOARDED_KEY, '1')
  visible.value = false
}
</script>

<style scoped>
.onb-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(5, 8, 5, 0.92);
  backdrop-filter: blur(8px);
}

.onb-card {
  position: relative;
  width: 100%;
  max-width: 380px;
  padding: 40px 24px 24px;
  background: linear-gradient(160deg, #16201a 0%, #0c120e 100%);
  border: 1px solid rgba(123, 199, 77, 0.2);
  border-radius: 24px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
  text-align: center;
}

.onb-skip {
  position: absolute;
  top: 14px;
  right: 16px;
  background: none;
  border: none;
  color: #888;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.onb-slide {
  animation: onbIn 0.35s ease;
}

@keyframes onbIn {
  from {
    opacity: 0;
    transform: translateX(16px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.onb-icon {
  width: 110px;
  height: 110px;
  margin: 8px auto 24px;
  border-radius: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(123, 199, 77, 0.25);
}

.onb-title {
  margin: 0 0 12px;
  font-size: 22px;
  font-weight: 800;
  color: #fff;
}

.onb-text {
  margin: 0 auto 28px;
  max-width: 300px;
  font-size: 15px;
  line-height: 1.55;
  color: #aab3a8;
}

.onb-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 24px;
}

.onb-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  cursor: pointer;
  transition: all 0.25s ease;
}

.onb-dot.active {
  width: 24px;
  border-radius: 4px;
  background: #7bc74d;
}

.onb-next {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 15px;
  background: linear-gradient(135deg, #7bc74d 0%, #5a9e3a 100%);
  border: none;
  border-radius: 16px;
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(123, 199, 77, 0.3);
  -webkit-tap-highlight-color: transparent;
}

.onb-next:active {
  transform: scale(0.98);
}

.onb-fade-enter-active,
.onb-fade-leave-active {
  transition: opacity 0.3s ease;
}

.onb-fade-enter-from,
.onb-fade-leave-to {
  opacity: 0;
}
</style>
