import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { EyeIcon, EyeOffIcon, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Anthropic from '~/shared/components/svgs/providers/Anthropic';
import Google from '~/shared/components/svgs/providers/Google';
import OpenAI from '~/shared/components/svgs/providers/OpenAI';
import { useNotificationStore } from '~/lib/stores/notificationStore';

export type ProviderStatus = {
  provider: string;
  hasKey: boolean;
  isActive?: boolean;
};

// Using the toast store instead of local notification types

export type ApiKeyManagerProps = {
  providers?: string[];
  initialProvider?: string;
  onSaveSuccess?: (provider: string) => void;
  onSetActiveSuccess?: (provider: string) => void;
  compact?: boolean;
  className?: string;
  autoSetActive?: boolean;
};

export type ApiKeyManagerHandle = {
  handleSaveApiKey: () => Promise<boolean>;
  hasApiKey: () => boolean;
  getActiveProvider: () => string;
};

export const ApiKeyManager = forwardRef<ApiKeyManagerHandle, ApiKeyManagerProps>(({
  providers = ['google', 'openai', 'anthropic'],
  initialProvider = 'google',
  onSaveSuccess,
  onSetActiveSuccess,
  className = '',
  autoSetActive = false
}, ref) => {
  const [activeProvider, setActiveProvider] = useState<string>(initialProvider);
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  const { success: showSuccess, error: showError } = useNotificationStore();

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    handleSaveApiKey,
    hasApiKey: () => apiKey.trim().length > 0,
    getActiveProvider: () => activeProvider
  }));

  // Reset form when provider changes
  useEffect(() => {
    setApiKey('');
    setShowApiKey(false);
  }, [activeProvider]);

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


  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai':
        return <OpenAI />
      case 'anthropic':
        return <Anthropic />
      case 'google':
        return <Google />
      default:
        return null;
    }
  };

  const validateApiKey = async (provider: string, key: string) => {
    const formData = new FormData();
    formData.append('provider', provider);
    formData.append('apiKey', key);

    try {
      const response = await fetch('/api/provider-keys/validate', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      return data.isValid;
    } catch (error) {
      console.error('Error validating API key:', error);
      return false;
    }
  };

  const handleSaveApiKey = async () => {
    if (!activeProvider || !apiKey.trim()) return false;

    try {
      setLoading('validating');

      const isValid = await validateApiKey(activeProvider, apiKey);

      if (!isValid) {
        setLoading(null);
        showError(`Your key for ${getProviderDisplayName(activeProvider)} is invalid. Try copying it again from your provider.`);
        return false;
      }

      setLoading('saving');

      const saveFormData = new FormData();
      saveFormData.append('action', 'saveKey');
      saveFormData.append('provider', activeProvider);
      saveFormData.append('apiKey', apiKey);

      const saveResponse = await fetch('/api/llm-provider', {
        method: 'POST',
        body: saveFormData,
      });

      const saveData = await saveResponse.json();

      if (saveResponse.ok) {
        setLoading(null);
        showSuccess(`${getProviderDisplayName(activeProvider)} API key saved successfully`);

        if (autoSetActive) {
          const activeFormData = new FormData();
          activeFormData.append('action', 'setActiveProvider');
          activeFormData.append('provider', activeProvider);

          try {
            const activeResponse = await fetch('/api/llm-provider', {
              method: 'POST',
              body: activeFormData,
            });

            if (activeResponse.ok && onSetActiveSuccess) {
              onSetActiveSuccess(activeProvider);
            }
          } catch (error) {
            console.error('Error setting provider as active:', error);
          }
        }

        // Call the success callback if provided
        if (onSaveSuccess) {
          onSaveSuccess(activeProvider);
        }

        return true;
      } else {
        setLoading(null);
        showError(saveData.error || `Failed to save ${getProviderDisplayName(activeProvider)} API key`);
        return false;
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      setLoading(null);
      showError(`Failed to save ${getProviderDisplayName(activeProvider)} API key`);
      return false;
    }
  };

  // We no longer need the renderNotification function since we're using the toast store

  return (
    <div className={`space-y-4 ${className}`}>

      {/* Provider selection */}
      <div className="space-y-2">
        <div className="text-sm font-medium">AI Provider</div>
        <div className="grid grid-cols-3 gap-2">
          {providers.map(providerName => (
            <button
              key={providerName}
              type="button"
              className={`flex items-center justify-start px-3 py-2 text-sm border rounded-md transition-colors ${activeProvider === providerName ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}
              onClick={() => setActiveProvider(providerName)}
              disabled={loading !== null}
            >
              <span className="mr-2">{getProviderIcon(providerName)}</span>
              <span>{getProviderDisplayName(providerName)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* API Key input */}
      <div className="space-y-2">
        <div className="text-sm font-medium">API Key</div>
        <div className="relative">
          <input
            type={showApiKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={`Enter your ${getProviderDisplayName(activeProvider)} API key`}
            disabled={loading !== null}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-10"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            onClick={() => setShowApiKey(!showApiKey)}
            disabled={loading !== null}
          >
            {showApiKey ? (
              <EyeOffIcon className="h-4 w-4" />
            ) : (
              <EyeIcon className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Your API key is stored securely and encrypted before saving.
        </p>
      </div>

      {/* Save button */}
      <div className="flex justify-end">
        <button
          type="button"
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${(!apiKey.trim() || loading !== null) ? 'opacity-75 cursor-not-allowed' : ''}`}
          onClick={handleSaveApiKey}
          disabled={!apiKey.trim() || loading !== null}
        >
          {loading ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {loading === 'validating' ? 'Validating...' : 'Saving...'}
            </span>
          ) : (
            'Validate & Save Key'
          )}
        </button>
      </div>
    </div>
  );
});
