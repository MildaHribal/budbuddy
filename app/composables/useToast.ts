import { ref } from 'vue'

interface ToastOptions {
  message: string
  title?: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface Toast extends ToastOptions {
  id: number
}

let nextId = 0
const toasts = ref<Toast[]>([])

export const useToast = () => {
  const show = (options: ToastOptions) => {
    const toast: Toast = {
      ...options,
      id: nextId++,
      type: options.type || 'info',
      duration: options.duration || 3000
    }

    toasts.value.push(toast)

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        remove(toast.id)
      }, toast.duration)
    }

    return toast.id
  }

  const remove = (id: number) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const success = (message: string, title?: string) => {
    return show({ message, title, type: 'success' })
  }

  const error = (message: string, title?: string) => {
    return show({ message, title, type: 'error' })
  }

  const warning = (message: string, title?: string) => {
    return show({ message, title, type: 'warning' })
  }

  const info = (message: string, title?: string) => {
    return show({ message, title, type: 'info' })
  }

  return {
    toasts,
    show,
    remove,
    success,
    error,
    warning,
    info
  }
}
