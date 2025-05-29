import { useState, useEffect } from 'react';
import { ApiKeyManager, type ProviderStatus, type Notification } from './ApiKeyManager';
import { Notification as NotificationComponent } from '~/components/common/Notification';

type ProviderKeysManagerProps = {
  userId: string;
  providerStatuses: ProviderStatus[];
  compact?: boolean;
  className?: string;
};

export function ProviderKeysManager({
  userId,
  providerStatuses,
  compact = false,
  className = ''
}: ProviderKeysManagerProps) {
  const [localProviderStatuses, setLocalProviderStatuses] = useState<ProviderStatus[]>(providerStatuses);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  // Initialize local state from props
  useEffect(() => {
    setLocalProviderStatuses(providerStatuses);
  }, [providerStatuses]);

  // Get provider display name for notifications
  const getProviderDisplayName = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'OpenAI';
      case 'anthropic':
        return 'Anthropic';
      case 'google':
        return 'Google AI';
      default:
        return provider;
    }
  };

  // Handle setting active provider
  const handleSetActiveProvider = async (provider: string) => {
    const formData = new FormData();
    formData.append('action', 'setActiveProvider');
    formData.append('provider', provider);

    try {
      setLoading('setting');

      const response = await fetch('/api/llm-provider', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        // Update local state to reflect the new active provider
        setLocalProviderStatuses(prevStatuses => {
          return prevStatuses.map(status => ({
            ...status,
            isActive: status.provider === provider,
          }));
        });

        setLoading(null); // Reset loading state
        setNotification({
          type: 'success',
          message: data.message || `${getProviderDisplayName(provider)} set as active provider`,
        });
      } else {
        console.error('Error setting active provider:', data);
        setLoading(null); // Reset loading state
        setNotification({
          type: 'error',
          message: data.details || data.error || 'Failed to set active provider',
        });
      }
    } catch (error) {
      console.error('Error setting active provider:', error);
      setLoading(null); // Reset loading state
      setNotification({
        type: 'error',
        message: `Failed to set ${getProviderDisplayName(provider)} as active provider`,
      });
    }
  };

  // Handle delete key
  const handleDeleteKey = async (provider: string) => {
    if (
      !confirm(
        `Are you sure you want to remove the ${getProviderDisplayName(provider)} API key?`
      )
    ) {
      return;
    }

    const formData = new FormData();
    formData.append('action', 'deleteKey');
    formData.append('provider', provider);

    try {
      setLoading('removing');

      const response = await fetch('/api/llm-provider', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        // Check if the deleted provider was active
        const wasActive = localProviderStatuses.find(
          s => s.provider === provider
        )?.isActive;

        // Update local state to reflect the removed API key
        setLocalProviderStatuses(prevStatuses => {
          const updatedStatuses = prevStatuses.map(status => {
            if (status.provider === provider) {
              return { ...status, hasKey: false, isActive: false };
            }
            return status;
          });

          // If the deleted provider was active, find another provider with a key to set as active
          if (wasActive) {
            const remainingWithKey = updatedStatuses.find(
              s => s.hasKey && s.provider !== provider
            );
            if (remainingWithKey) {
              // Set the first remaining provider with a key as active
              return updatedStatuses.map(status => ({
                ...status,
                isActive: status.provider === remainingWithKey.provider,
              }));
            }
          }

          return updatedStatuses;
        });

        setLoading(null); // Reset loading state
        // If the deleted provider was active, automatically set the remaining provider as active in the backend
        if (wasActive) {
          const remainingWithKey = localProviderStatuses.find(
            s => s.hasKey && s.provider !== provider
          );
          if (remainingWithKey) {
            // Call the API to set the new active provider
            const newActiveProvider = remainingWithKey.provider;
            const formData = new FormData();
            formData.append('action', 'setActiveProvider');
            formData.append('provider', newActiveProvider);

            fetch('/api/llm-provider', {
              method: 'POST',
              body: formData,
            })
              .then(response => response.json())
              .then(data => {
                if (response.ok) {
                  setNotification({
                    type: 'success',
                    message: `${getProviderDisplayName(
                      provider
                    )} API key removed and ${getProviderDisplayName(
                      newActiveProvider
                    )} set as active`,
                  });
                }
              })
              .catch(error => {
                console.error('Error setting new active provider:', error);
              });
          } else {
            setNotification({
              type: 'success',
              message:
                data.message ||
                `${getProviderDisplayName(provider)} API key removed successfully`,
            });
          }
        } else {
          setNotification({
            type: 'success',
            message:
              data.message ||
              `${getProviderDisplayName(provider)} API key removed successfully`,
          });
        }
      } else {
        console.error('Error removing API key:', data);
        setLoading(null); // Reset loading state
        setNotification({
          type: 'error',
          message: data.details || data.error || 'Failed to remove API key',
        });
      }
    } catch (error) {
      console.error('Error removing API key:', error);
      setLoading(null); // Reset loading state
      setNotification({
        type: 'error',
        message: `Failed to remove ${getProviderDisplayName(provider)} API key`,
      });
    }
  };

  // Handle API key save success
  const handleSaveSuccess = (provider: string) => {
    // Update local state to reflect the saved API key
    setLocalProviderStatuses(prevStatuses => {
      return prevStatuses.map(status => {
        if (status.provider === provider) {
          return { ...status, hasKey: true };
        }
        return status;
      });
    });

    // Check if this is the first API key being added
    const hasAnyActiveProvider = localProviderStatuses.some(s => s.isActive);
    const isFirstKey = !localProviderStatuses.some(
      s => s.hasKey && s.provider !== provider
    );

    // If this is the first key or there's no active provider, automatically set it as active
    if (!hasAnyActiveProvider || isFirstKey) {
      // Set as active in local state immediately
      setLocalProviderStatuses(prevStatuses => {
        return prevStatuses.map(status => ({
          ...status,
          isActive: status.provider === provider,
        }));
      });

      setNotification({
        type: 'success',
        message: `${getProviderDisplayName(
          provider
        )} API key saved and set as active`,
      });
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium">API Keys</h3>
        <p className="text-xs text-muted-foreground/60">
          Add your own API keys for language models to use in the application.
        </p>
        {notification && (
          <div className="mt-2">
            <NotificationComponent
              type={notification.type}
              message={notification.message}
              onClose={() => setNotification(null)}
            />
          </div>
        )}

        {/* Provider cards - vertical layout */}
        <div className="flex flex-col gap-4 mt-2">
          {localProviderStatuses.map(status => (
            <div key={status.provider} className="flex flex-col">
              {/* Provider header */}
              <div
                className={`
                  p-3 transition-all border
                  ${status.hasKey
                    ? 'bg-blue-50/50 border-blue-200'
                    : 'bg-muted border-border hover:border-gray-300'
                  }
                  rounded-xl cursor-pointer
                `}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`text-${status.hasKey ? 'blue' : 'gray'}-600`}>
                      {/* Provider icon would go here */}
                    </div>
                    <span className="font-medium text-sm">
                      {getProviderDisplayName(status.provider)}
                    </span>
                  </div>
                  {status.hasKey && (
                    <div className="flex items-center gap-2">
                      {status.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetActiveProvider(status.provider)}
                          className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
                          disabled={loading !== null}
                        >
                          {loading === 'setting' && status.provider === status.provider ? (
                            <span className="flex items-center">
                              <svg
                                className="animate-spin -ml-1 mr-1 h-3 w-3 text-blue-700"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Setting...
                            </span>
                          ) : (
                            'Set Active'
                          )}
                        </button>
                      )}
                      <button
                        type="button"
                        className="text-xs text-rose-600 hover:text-rose-800 transition-colors inline-flex items-center"
                        disabled={loading !== null}
                        onClick={() => handleDeleteKey(status.provider)}
                      >
                        {loading === 'removing' && status.provider === status.provider ? (
                          <span className="flex items-center">
                            <svg
                              className="animate-spin -ml-1 mr-1 h-3 w-3 text-rose-600"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            Removing...
                          </span>
                        ) : (
                          'Remove Key'
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* API Key Form - appears when no key is present */}
              {!status.hasKey && (
                <div className="p-4 border border-border border-t-0 bg-white rounded-b-xl">
                  <ApiKeyManager
                    providers={[status.provider]}
                    initialProvider={status.provider}
                    onSaveSuccess={handleSaveSuccess}
                    compact={compact}
                    showNotifications={false}
                    autoSetActive={true}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
