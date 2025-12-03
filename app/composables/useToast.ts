import { ref } from 'vue'
}
  }
    info
    warning,
    error,
    success,
    remove,
    show,
    toasts,
  return {

  }
    return show({ message, title, type: 'info' })
  const info = (message: string, title?: string) => {

  }
    return show({ message, title, type: 'warning' })
  const warning = (message: string, title?: string) => {

  }
    return show({ message, title, type: 'error' })
  const error = (message: string, title?: string) => {

  }
    return show({ message, title, type: 'success' })
  const success = (message: string, title?: string) => {

  }
    }
      toasts.value.splice(index, 1)
    if (index > -1) {
    const index = toasts.value.findIndex(t => t.id === id)
  const remove = (id: number) => {

  }
    return toast.id

    }
      }, toast.duration)
        remove(toast.id)
      setTimeout(() => {
    if (toast.duration > 0) {

    toasts.value.push(toast)

    }
      duration: options.duration || 3000
      type: options.type || 'info',
      id: nextId++,
      ...options,
    const toast: Toast = {
  const show = (options: ToastOptions) => {
export const useToast = () => {

let nextId = 0
const toasts = ref<Toast[]>([])

}
  id: number
interface Toast extends ToastOptions {

}
  duration?: number
  type?: 'success' | 'error' | 'warning' | 'info'
  title?: string
  message: string
interface ToastOptions {


