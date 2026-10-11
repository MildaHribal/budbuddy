import type { Ref } from 'vue'

const MARGIN = 600

/**
 * Infinite scroll that keeps loading while the sentinel stays near the viewport,
 * so a page whose rows are all filtered out doesn't stall (M6).
 */
export function useInfinite(sentinel: Ref<HTMLElement | null>, load: () => Promise<unknown>, more: () => boolean) {
  let observer: IntersectionObserver | null = null
  let running = false

  const near = () => {
    const el = sentinel.value
    if (!el || !el.isConnected) return false
    return el.getBoundingClientRect().top < window.innerHeight + MARGIN
  }

  async function pump() {
    if (running) return
    running = true
    try {
      for (let i = 0; i < 8 && more() && near(); i++) {
        await load()
        await nextTick()
      }
    } finally {
      running = false
    }
  }

  onMounted(() => {
    observer = new IntersectionObserver((es) => {
      if (es.some(e => e.isIntersecting)) pump()
    }, { rootMargin: `${MARGIN}px 0px` })
    if (sentinel.value) observer.observe(sentinel.value)
  })
  onBeforeUnmount(() => observer?.disconnect())

  return { pump }
}
