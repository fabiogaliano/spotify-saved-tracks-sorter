import type { ExternalToast } from 'sonner'

export type NotificationTypes = 'success' | 'info' | 'warning' | 'error' | 'loading' | 'default'
export type NotificationOptions = ExternalToast

export interface PromiseNotificationOptions<T> {
  loading?: React.ReactNode;
  success?: string | React.ReactNode | ((data: T) => React.ReactNode | string | Promise<React.ReactNode | string>);
  error?: string | React.ReactNode | ((error: any) => React.ReactNode | string | Promise<React.ReactNode | string>);
  finally?: () => void | Promise<void>;
}

export type MessageContent = React.ReactNode | (() => React.ReactNode)

export interface NotificationStore {
  notify: (message: MessageContent, options?: NotificationOptions) => string | number
  success: (message: MessageContent, options?: NotificationOptions) => string | number
  error: (message: MessageContent, options?: NotificationOptions) => string | number
  warning: (message: MessageContent, options?: NotificationOptions) => string | number
  info: (message: MessageContent, options?: NotificationOptions) => string | number
  loading: (message: MessageContent, options?: NotificationOptions) => string | number

  promise: <T>(promise: Promise<T> | (() => Promise<T>), options: PromiseNotificationOptions<T>) => Promise<T>

  dismiss: (toastId?: string | number) => string | number
}