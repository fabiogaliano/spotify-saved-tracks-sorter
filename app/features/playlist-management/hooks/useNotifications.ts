import { useState, useCallback } from 'react';
import { useNotificationStore } from '~/lib/stores/notificationStore';

type NotificationType = 'success' | 'info' | 'error';

interface NotificationState {
  type: NotificationType;
  message: string;
}

/**
 * Custom hook for managing component-level notifications
 * with automatic timeout and integration with the global notification store
 */
export function useNotifications(timeout: number = 3000) {
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const globalNotify = useNotificationStore();

  const showNotification = useCallback((type: NotificationType, message: string, useGlobal: boolean = false) => {
    if (useGlobal) {
      // Use the global notification system
      switch (type) {
        case 'success':
          globalNotify.success(message);
          break;
        case 'error':
          globalNotify.error(message);
          break;
        default:
          globalNotify.info(message);
      }
    } else {
      // Use the local notification system
      setNotification({ type, message });
      
      // Auto-dismiss after timeout
      setTimeout(() => setNotification(null), timeout);
    }
  }, [globalNotify, timeout]);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    notification,
    showSuccess: (message: string, useGlobal: boolean = false) => 
      showNotification('success', message, useGlobal),
    showInfo: (message: string, useGlobal: boolean = false) => 
      showNotification('info', message, useGlobal),
    showError: (message: string, useGlobal: boolean = false) => 
      showNotification('error', message, useGlobal),
    clearNotification
  };
}
