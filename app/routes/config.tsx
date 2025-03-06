import { json } from '@remix-run/node'
import type { LoaderFunctionArgs, MetaFunction } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { authenticator } from '~/core/auth/auth.server'
import type { SpotifySession } from '~/core/auth/auth.server'
import { Config } from '~/components/Config'
import { providerKeyService } from '~/core/services/llm/ProviderKeyService'

export const meta: MetaFunction = () => {
  return [
    { title: 'Configuration - Spotify AI Sorter' },
    { name: 'description', content: 'Configure your Spotify AI Sorter settings' },
  ]
}

export async function loader({ request }: LoaderFunctionArgs) {
  // Ensure user is authenticated
  const session = (await authenticator.isAuthenticated(request)) as SpotifySession | null
  
  if (!session) {
    return json({ user: null })
  }
  
  // Get provider statuses for the user
  const providerStatuses = await providerKeyService.getProviderStatuses(session.user.id.toString())
  const hasApiKeys = providerStatuses.some(status => status.hasKey)
  
  return json({
    user: session.user,
    providerStatuses,
    hasApiKeys
  })
}

export default function ConfigPage() {
  const data = useLoaderData<typeof loader>()
  
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Configuration</h1>
      <Config />
    </div>
  )
}
