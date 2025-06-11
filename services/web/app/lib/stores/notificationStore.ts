import { create } from 'zustand'
import { toast } from 'sonner'
import { NotificationStore } from '../models/Notification'

export const useNotificationStore = create<NotificationStore>(() => ({
  notify: (message, options) => toast(message, options),
  success: (message, options) => toast.success(message, options),
  error: (message, options) => toast.error(message, options),
  warning: (message, options) => toast.warning(message, options),
  info: (message, options) => toast.info(message, options),
  loading: (message, options) => toast.loading(message, options),

  promise: (promise, options) => {
    // Call toast.promise but return the original promise to maintain Promise<T> type
    const promiseResult = typeof promise === 'function' ? promise() : promise
    toast.promise(promise, options)
    return promiseResult
  },

  dismiss: (toastId) => toast.dismiss(toastId)
}))
