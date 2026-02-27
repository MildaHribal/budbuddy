import { ref, onMounted, onUnmounted } from 'vue'

const DESKTOP_BREAKPOINT = 768

export function useDeviceType() {
  const isDesktop = ref(false)

  function check() {
    if (typeof window !== 'undefined') {
      isDesktop.value = window.innerWidth > DESKTOP_BREAKPOINT
    }
  }

  onMounted(() => {
    check()
    window.addEventListener('resize', check)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', check)
  })

  return { isDesktop }
}
