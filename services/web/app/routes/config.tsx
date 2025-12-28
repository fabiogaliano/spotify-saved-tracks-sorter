import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { useLoaderData } from 'react-router'

import { Config } from '~/components/Config'
import { authenticator } from '~/features/auth/auth.server'
import type { SpotifySession } from '~/features/auth/auth.server'
import { providerKeyService } from '~/lib/services/llm/ProviderKeyService'

export const meta: MetaFunction = () => {
	return [
		{ title: 'Configuration - Spotify AI Sorter' },
		{ name: 'description', content: 'Configure your Spotify AI Sorter settings' },
	]
}

export type ConfigLoaderData = {
	user: SpotifySession['user'] | null
	providerStatuses: Array<{
		provider: string
		hasKey: boolean
		isActive: boolean
	}>
	hasApiKeys: boolean
}

export async function loader({ request }: LoaderFunctionArgs) {
	const session = (await authenticator.isAuthenticated(request)) as SpotifySession | null
	if (!session) {
		return { user: null }
	}

	const providerStatuses = await providerKeyService.getProviderStatuses(
		parseInt(session.user.id)
	)
	const hasApiKeys = providerStatuses.some(status => status.hasKey)

	return {
		user: session.user,
		providerStatuses,
		hasApiKeys,
	}
}

export default function ConfigPage() {
	return (
		<div className="mx-auto max-w-4xl px-4 py-8">
			<h1 className="mb-6 text-2xl font-bold">Configuration</h1>
			<Config />
		</div>
	)
}
