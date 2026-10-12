import { onBeforeUnmount, onMounted } from 'vue'

/** Runs `retry` when the connection comes back while `failed()` is true. */
export function useOnlineRetry(failed: () => boolean, retry: () => unknown) {
  const on = () => {
    if (failed()) retry()
  }
  onMounted(() => window.addEventListener('online', on))
  onBeforeUnmount(() => window.removeEventListener('online', on))
}
