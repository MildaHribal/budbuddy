import { ref, onMounted } from 'vue'

export function useDeviceType() {
  const isDesktop = ref(false)

  function check() {
    if (typeof window === 'undefined') return

    // Force phone frame via URL parameter ?demo=true
    const params = new URLSearchParams(window.location.search)
    if (params.get('demo') === 'true') {
      isDesktop.value = true
      return
    }

    // Detect actual mobile devices via userAgent and touch capability
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
    const isTouchOnly = 'ontouchstart' in window && navigator.maxTouchPoints > 0 && !('onmouseover' in window && window.innerWidth > 1024)

    // Show phone frame on desktop (non-mobile) devices regardless of window size
    isDesktop.value = !isMobileUA && !isTouchOnly
  }

  onMounted(() => {
    check()
  })

  return { isDesktop }
}
