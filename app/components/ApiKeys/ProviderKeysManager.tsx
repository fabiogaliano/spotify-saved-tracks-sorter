import { useState, useEffect } from 'react'
import { Form, useActionData, useNavigation, useSubmit } from '@remix-run/react'
import type { ProviderKey } from '~/core/domain/ProviderKeys'

type ProviderStatus = {
  provider: string
  hasKey: boolean
}

type ProviderKeysManagerProps = {
  userId: string
  providerStatuses: ProviderStatus[]
}

export function ProviderKeysManager({ userId, providerStatuses }: ProviderKeysManagerProps) {
  const actionData = useActionData<{ success?: boolean; error?: string }>()
  const navigation = useNavigation()
  const submit = useSubmit()
  const [activeProvider, setActiveProvider] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  // Reset form when provider changes
  useEffect(() => {
    setApiKey('')
    setShowApiKey(false)
  }, [activeProvider])

  // Get provider display name
  const getProviderDisplayName = (provider: string) => {
    switch (provider) {
      case 'openai':
        return 'OpenAI'
      case 'anthropic':
        return 'Anthropic (Claude)'
      case 'google':
        return 'Google (Gemini)'
      default:
        return provider
    }
  }

  // Get provider logo/icon
  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'openai':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.5091-2.6067-1.4997z" fill="currentColor"/>
          </svg>
        )
      case 'anthropic':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM15.88 8.29L10.29 13.88C10.2 13.97 10.1 14 10 14C9.9 14 9.8 13.97 9.71 13.88L8.12 12.29C7.93 12.1 7.93 11.79 8.12 11.6C8.31 11.41 8.62 11.41 8.81 11.6L10 12.79L15.19 7.6C15.38 7.41 15.69 7.41 15.88 7.6C16.07 7.79 16.07 8.1 15.88 8.29Z" fill="currentColor"/>
          </svg>
        )
      case 'google':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM11 7H13V9H11V7ZM11 11H13V17H11V11Z" fill="currentColor"/>
          </svg>
        )
      default:
        return null
    }
  }

  // Handle form submission
  const [saveStatus, setSaveStatus] = useState<{ message: string; isError: boolean } | null>(null)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!activeProvider || !apiKey.trim()) return
    
    const formData = new FormData()
    formData.append('action', 'saveKey')
    formData.append('provider', activeProvider)
    formData.append('apiKey', apiKey)
    
    try {
      setSaveStatus({ message: `Saving ${getProviderDisplayName(activeProvider)} API key...`, isError: false })
      
      const response = await fetch('/api/llm-provider', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSaveStatus({ 
          message: data.message || `${getProviderDisplayName(activeProvider)} API key saved successfully`, 
          isError: false 
        })
        // Refresh the page to show updated provider statuses after a short delay
        setTimeout(() => window.location.reload(), 1500)
      } else {
        console.error('Error saving API key:', data)
        setSaveStatus({ 
          message: data.details || data.error || 'Failed to save API key', 
          isError: true 
        })
      }
    } catch (error) {
      console.error('Error saving API key:', error)
      setSaveStatus({ 
        message: `Failed to save ${getProviderDisplayName(activeProvider)} API key`, 
        isError: true 
      })
    }
  }

  // Handle delete key
  const handleDeleteKey = async (provider: string) => {
    if (!confirm(`Are you sure you want to remove the ${getProviderDisplayName(provider)} API key?`)) {
      return
    }
    
    const formData = new FormData()
    formData.append('action', 'deleteKey')
    formData.append('provider', provider)
    
    try {
      setSaveStatus({ message: `Removing ${getProviderDisplayName(provider)} API key...`, isError: false })
      
      const response = await fetch('/api/llm-provider', {
        method: 'POST',
        body: formData
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setSaveStatus({ 
          message: data.message || `${getProviderDisplayName(provider)} API key removed successfully`, 
          isError: false 
        })
        // Refresh the page to show updated provider statuses after a short delay
        setTimeout(() => window.location.reload(), 1500)
      } else {
        console.error('Error removing API key:', data)
        setSaveStatus({ 
          message: data.details || data.error || 'Failed to remove API key', 
          isError: true 
        })
      }
    } catch (error) {
      console.error('Error removing API key:', error)
      setSaveStatus({ 
        message: `Failed to remove ${getProviderDisplayName(provider)} API key`, 
        isError: true 
      })
    }
  }

  // Validate API key before saving
  const validateApiKey = async (provider: string, key: string) => {
    const formData = new FormData()
    formData.append('provider', provider)
    formData.append('apiKey', key)
    
    try {
      const response = await fetch('/api/provider-keys/validate', {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      return data.isValid
    } catch (error) {
      console.error('Error validating API key:', error)
      return false
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-medium">API Keys</h3>
        <p className="text-xs text-gray-600">
          Add your own API keys for language models to use in the application.
        </p>
        
        {/* Provider cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          {providerStatuses.map((status) => (
            <div 
              key={status.provider}
              className={`
                flex flex-col p-4 rounded-xl border transition-all
                ${status.hasKey 
                  ? 'bg-blue-50/50 border-blue-200' 
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'}
                ${activeProvider === status.provider ? 'ring-2 ring-blue-400' : ''}
                cursor-pointer
              `}
              onClick={() => setActiveProvider(status.provider)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`text-${status.hasKey ? 'blue' : 'gray'}-600`}>
                    {getProviderIcon(status.provider)}
                  </div>
                  <span className="font-medium text-sm">
                    {getProviderDisplayName(status.provider)}
                  </span>
                </div>
                {status.hasKey && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    Active
                  </span>
                )}
              </div>
              
              {status.hasKey ? (
                <div className="mt-auto pt-2 flex justify-end">
                  <button
                    type="button"
                    className="text-xs text-rose-600 hover:text-rose-800 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteKey(status.provider)
                    }}
                  >
                    Remove Key
                  </button>
                </div>
              ) : (
                <div className="mt-auto pt-2">
                  <span className="text-xs text-gray-500">
                    No key configured
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* API Key Form */}
      {activeProvider && (
        <div className="mt-6 p-4 border border-gray-200 rounded-xl bg-white">
          <h4 className="text-sm font-medium mb-4">
            Configure {getProviderDisplayName(activeProvider)} API Key
          </h4>
          
          <Form method="post" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="apiKey" className="block text-xs font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    id="apiKey"
                    name="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder={`Enter your ${getProviderDisplayName(activeProvider)} API key`}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Your API key is encrypted before being stored and never shared.
                </p>
              </div>
              
              {saveStatus && (
                <div className={`mt-2 p-2 text-sm rounded ${saveStatus.isError ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'}`}>
                  {saveStatus.message}
                </div>
              )}
              
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={async () => {
                    if (activeProvider && apiKey.trim()) {
                      const isValid = await validateApiKey(activeProvider, apiKey);
                      if (isValid) {
                        alert('API key is valid!');
                      } else {
                        alert('API key validation failed. Please check your key and try again.');
                      }
                    }
                  }}
                  disabled={navigation.state === 'submitting' || !apiKey.trim()}
                  className={`
                    inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm
                    text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    ${(navigation.state === 'submitting' || !apiKey.trim()) ? 'opacity-75 cursor-not-allowed' : ''}
                  `}
                >
                  Validate Key
                </button>
                
                <button
                  type="submit"
                  disabled={navigation.state === 'submitting' || !apiKey.trim()}
                  className={`
                    inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm
                    text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                    ${(navigation.state === 'submitting' || !apiKey.trim()) ? 'opacity-75 cursor-not-allowed' : ''}
                  `}
                >
                  {navigation.state === 'submitting' ? 'Saving...' : 'Save API Key'}
                </button>
              </div>
            </div>
          </Form>
        </div>
      )}
    </div>
  )
}
