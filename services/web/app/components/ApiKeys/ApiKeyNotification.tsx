import { useState, useEffect } from 'react'
import { Link } from 'react-router';
import { Notification } from '~/components/common/Notification'

type ApiKeyNotificationProps = {
  hasApiKeys: boolean
}

export function ApiKeyNotification({ hasApiKeys }: ApiKeyNotificationProps) {
  const [dismissed, setDismissed] = useState(false)
  
  // Check local storage for dismissed state on mount
  useEffect(() => {
    const isDismissed = localStorage.getItem('apiKeyNotificationDismissed') === 'true'
    setDismissed(isDismissed)
  }, [])
  
  // If user has API keys or notification is dismissed, don't show anything
  if (hasApiKeys || dismissed) {
    return null
  }
  
  const handleDismiss = () => {
    localStorage.setItem('apiKeyNotificationDismissed', 'true')
    setDismissed(true)
  }
  
  return (
    <Notification
      type="info"
      message="You haven't set up any API keys yet. Add your own API keys to use language models in the application."
      onClose={handleDismiss}
      persistent={true}
      action={{
        label: "Configure API Keys",
        onClick: () => {
          window.location.href = '/config';
        }
      }}
    />
  )
}
