/**
 * Main App Component
 *
 * Bloomberg terminal-style cost estimation dashboard.
 * Features tab navigation, interactive provider/model selection,
 * sample size configuration, and real-time cost projections.
 */

import { useState, useEffect } from 'react'
import { useKeyboard } from '@opentui/react'
import { BLOOMBERG } from './theme'
import {
	Header,
	TabBar,
	CostTable,
	ComparisonTable,
	StatusBar,
	ControlPanel,
	type TabType,
} from './components'
import { useEstimation, useConfig } from './hooks'
import type { Provider } from '../types'

export function App() {
	// Config and providers
	const { config, getProvidersForTab, error: configError } = useConfig()

	// UI State
	const [activeTab, setActiveTab] = useState<TabType>('vectorization')
	const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
	const [comparisonProviders, setComparisonProviders] = useState<Provider[]>([])
	const [sampleSize, setSampleSize] = useState(25)
	const [isCustomInputActive, setIsCustomInputActive] = useState(false)

	// Set default provider when tab changes or config loads
	useEffect(() => {
		const providers = getProvidersForTab(activeTab)
		if (providers.length > 0 && (!selectedProvider || selectedProvider.type !== activeTab)) {
			setSelectedProvider(providers[0])
		}
		// Clear comparison providers when switching tabs (different provider types)
		setComparisonProviders([])
	}, [activeTab, config])

	// Estimation
	const {
		stats,
		measurements,
		projections,
		modelCosts,
		scaleComparisons,
		isLoading,
		progress,
		error: estimationError,
		runEstimation,
		refresh,
	} = useEstimation({
		activeTab,
		provider: selectedProvider,
		comparisonProviders,
		sampleSize,
	})

	// Global keyboard shortcuts
	useKeyboard((key) => {
		// Tab switching with left/right arrows or 1/2 keys (unless typing in custom input)
		if (key.name === 'left') setActiveTab('vectorization')
		if (key.name === 'right') setActiveTab('llm')
		if (!isCustomInputActive) {
			if (key.name === '1') setActiveTab('vectorization')
			if (key.name === '2') setActiveTab('llm')
		}

		// Quit
		if (key.name === 'q' && !key.ctrl && !key.shift) {
			process.exit(0)
		}

		// Refresh with Ctrl+R
		if (key.name === 'r' && key.ctrl) {
			refresh()
		}
	})

	// Combine errors
	const error = configError || estimationError

	// Status - different display for comparison mode (2+ models) vs single model mode
	const isComparing = comparisonProviders.length >= 2

	const statusLabel = error
		? 'ERROR'
		: isLoading
			? 'Running estimation...'
			: isComparing
				? 'COMPARING'
				: selectedProvider
					? 'SELECTED'
					: 'Ready'

	const statusValue = error
		? error
		: isLoading
			? undefined
			: isComparing
				? `${comparisonProviders.length} models`
				: selectedProvider
					? selectedProvider.model
					: 'Select provider and press Enter to run'

	const statusColor = error ? BLOOMBERG.error : isLoading ? BLOOMBERG.info : BLOOMBERG.amber

	return (
		<box width="100%" height="100%" flexDirection="column" backgroundColor={BLOOMBERG.bg}>
			{/* Header with ASCII title and stats */}
			<Header trackCount={stats.total} analyzedCount={stats.analyzed} />

			{/* Tab navigation */}
			<TabBar activeTab={activeTab} onTabChange={setActiveTab} />

			{/* Main content area */}
			<box flexGrow={1} flexDirection="row" padding={1} gap={1}>
				{/* Left side: Controls (grows with window) */}
				<box flexGrow={1} flexDirection="column" gap={1}>
					{/* Control Panel */}
					<ControlPanel
						activeTab={activeTab}
						providers={config?.providers ?? []}
						selectedProvider={selectedProvider}
						onProviderChange={setSelectedProvider}
						comparisonProviders={comparisonProviders}
						onComparisonProvidersChange={setComparisonProviders}
						sampleSize={sampleSize}
						onSampleSizeChange={setSampleSize}
						onRunEstimation={runEstimation}
						isRunning={isLoading}
						onCustomInputActive={setIsCustomInputActive}
					/>
				</box>

				{/* Right side: Results (only shown when we have data or are loading) */}
				{(isLoading || projections.length > 0 || measurements || scaleComparisons.length > 0) && (
					<box width={68} flexDirection="column" gap={1}>
						{/* Cost projections table (single model mode) */}
						{scaleComparisons.length === 0 && (
							<CostTable
								type={activeTab}
								projections={projections}
								measurements={measurements}
								modelCosts={modelCosts}
								isLoading={isLoading && projections.length === 0}
							/>
						)}

						{/* Multi-model comparison table (2+ models) */}
						{scaleComparisons.length > 0 && (
							<ComparisonTable
								comparisons={scaleComparisons}
								measurements={measurements}
								isLoading={isLoading}
							/>
						)}
					</box>
				)}
			</box>

			{/* Status bar */}
			<StatusBar statusLabel={statusLabel} statusValue={statusValue} statusColor={statusColor} progress={progress ?? undefined} />
		</box>
	)
}
