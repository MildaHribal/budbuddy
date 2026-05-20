<script setup lang="ts">
import { ref } from 'vue'
import { useTreeModel } from '~/composables/useTreeModel'

defineProps({
  image: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: false }
})

const emit = defineEmits(['add', 'select'])
const pressed = ref(false)

function handleSelect() {
  emit('select')
  pressed.value = true
  setTimeout(() => (pressed.value = false), 160)
}

const { selectedTree } = useTreeModel()
</script>

<template>
  <div
    :class="[
      'flex flex-col bg-black/20 rounded-xl overflow-hidden transform transition-all duration-150',
      (isActive || pressed) ? 'border-2 border-[color:var(--accent)]' : 'border-transparent',
      pressed ? 'scale-95' : ''
    ]"
  >
    <div
      role="button"
      tabindex="0"
      class="relative w-full flex flex-col cursor-pointer"
      @click="handleSelect"
      @keydown.enter.prevent="handleSelect"
      @keydown.space.prevent="handleSelect"
    >
      <div class="relative w-full h-48 overflow-hidden bg-black/20">
        <img
          :src="image"
          :alt="title"
          class="w-full h-full object-contain p-4"
        >
      </div>

      <div class="p-4">
        <h4
          class="text-white font-semibold text-lg mb-1"
          :class="{ 'text-[color:var(--accent)]': isActive }"
        >
          {{ title }}
        </h4>
        <p class="text-gray-300 text-sm">
          {{ description }}
        </p>
      </div>

      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="isActive"
          class="absolute inset-0 bg-black/60 flex items-center justify-center z-10 backdrop-blur-[1px]"
        >
          <button
            class="bg-[color:var(--accent)] text-white px-5 py-2 rounded font-bold hover:bg-[#6ab342] shadow-lg transform active:scale-95 transition-all"
            @click.stop="selectedTree = title"
          >
            Select
          </button>
        </div>
      </Transition>
    </div>
  </div>
</template>
