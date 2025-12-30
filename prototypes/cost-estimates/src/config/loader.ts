/**
 * Configuration loader for cost estimation
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { parse } from 'yaml'

import type { Config } from '../types'

export function loadConfig(configPath?: string): Config {
	const path = configPath ?? join(import.meta.dir, '../../config.yaml')
	const content = readFileSync(path, 'utf-8')
	const config = parse(content) as Config

	validateConfig(config)
	return config
}

function validateConfig(config: Config): void {
	if (!config.defaults) {
		throw new Error('Config missing "defaults" section')
	}
	if (!config.providers || !Array.isArray(config.providers)) {
		throw new Error('Config missing "providers" array')
	}
	if (config.providers.length === 0) {
		throw new Error('Config has no providers defined')
	}

	for (const provider of config.providers) {
		if (!provider.name || !provider.type || !provider.model) {
			throw new Error(`Invalid provider config: ${JSON.stringify(provider)}`)
		}
	}
}

export function getProvidersByType(
	config: Config,
	type: 'vectorization' | 'llm'
): Config['providers'] {
	return config.providers.filter((p) => p.type === type)
}
