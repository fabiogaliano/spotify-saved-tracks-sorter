/**
 * useConfig Hook
 *
 * Loads and provides access to the config.yaml configuration.
 */

import { useState, useEffect } from 'react'
import { loadConfig, getProvidersByType } from '../../config/loader'
import type { Config, Provider } from '../../types'
import type { TabType } from '../components/TabBar'

interface UseConfigResult {
	config: Config | null
	providers: Provider[]
	getProvidersForTab: (tab: TabType) => Provider[]
	error: string | null
}

export function useConfig(): UseConfigResult {
	const [config, setConfig] = useState<Config | null>(null)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		try {
			const loaded = loadConfig()
			setConfig(loaded)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load config')
		}
	}, [])

	const getProvidersForTab = (tab: TabType): Provider[] => {
		if (!config) return []
		return getProvidersByType(config, tab)
	}

	return {
		config,
		providers: config?.providers ?? [],
		getProvidersForTab,
		error,
	}
}
