/**
 * ControlPanel Component
 *
 * Interactive controls for configuring the estimation:
 * - Provider/Model selection
 * - Sample size selection
 */

import { useState, useEffect } from 'react'
import { useKeyboard } from '@opentui/react'
import { BLOOMBERG, panelStyle } from '../theme'
import type { Provider } from '../../types'
import type { TabType } from './TabBar'

export interface ControlPanelProps {
	activeTab: TabType
	providers: Provider[]
	selectedProvider: Provider | null
	onProviderChange: (provider: Provider) => void
	comparisonProviders: Provider[]
	onComparisonProvidersChange: (providers: Provider[]) => void
	sampleSize: number
	onSampleSizeChange: (size: number) => void
	onRunEstimation: () => void
	isRunning: boolean
	onCustomInputActive?: (active: boolean) => void
}

const MAX_COMPARISON_PROVIDERS = 4

const SAMPLE_SIZES = [25, 50, 100, 250, 500]

export function ControlPanel({
	activeTab,
	providers,
	selectedProvider,
	onProviderChange,
	comparisonProviders,
	onComparisonProvidersChange,
	sampleSize,
	onSampleSizeChange,
	onRunEstimation,
	isRunning,
	onCustomInputActive,
}: ControlPanelProps) {
	const [focusedSection, setFocusedSection] = useState<'provider' | 'sample'>('provider')
	const [providerIndex, setProviderIndex] = useState(0)
	const [sampleIndex, setSampleIndex] = useState(SAMPLE_SIZES.indexOf(sampleSize))
	const [customSample, setCustomSample] = useState('')
	const [cursorVisible, setCursorVisible] = useState(true)

	// Check if custom option is selected (last index)
	const isSampleCustom = sampleIndex === SAMPLE_SIZES.length

	// Notify parent when custom input mode changes
	useEffect(() => {
		onCustomInputActive?.(isSampleCustom && focusedSection === 'sample')
	}, [isSampleCustom, focusedSection, onCustomInputActive])

	// Blinking cursor effect
	useEffect(() => {
		if (!isSampleCustom) return
		const interval = setInterval(() => {
			setCursorVisible((v) => !v)
		}, 530)
		return () => clearInterval(interval)
	}, [isSampleCustom])

	// Filter providers by active tab type
	const filteredProviders = providers.filter((p) => p.type === activeTab)

	// Keyboard navigation
	useKeyboard((key) => {
		if (isRunning) return

		// Handle digit input for custom fields
		if (/^[0-9]$/.test(key.name || '')) {
			if (focusedSection === 'sample' && isSampleCustom) {
				const newValue = customSample + key.name
				setCustomSample(newValue)
				const num = parseInt(newValue, 10)
				if (num > 0) onSampleSizeChange(num)
				return
			}
		}

		// Handle backspace for custom fields
		if (key.name === 'backspace') {
			if (focusedSection === 'sample' && isSampleCustom && customSample.length > 0) {
				const newValue = customSample.slice(0, -1)
				setCustomSample(newValue)
				const num = parseInt(newValue, 10)
				if (num > 0) onSampleSizeChange(num)
				return
			}
		}

		// Section switching with Tab
		if (key.name === 'tab') {
			setFocusedSection((s) => (s === 'provider' ? 'sample' : 'provider'))
			return
		}

		// Space to toggle comparison provider selection (in provider section)
		if (key.name === 'space' && focusedSection === 'provider') {
			const targetProvider = filteredProviders[providerIndex]
			if (!targetProvider) return

			const isSelected = comparisonProviders.some((p) => p.name === targetProvider.name)
			if (isSelected) {
				// Remove from comparison
				onComparisonProvidersChange(
					comparisonProviders.filter((p) => p.name !== targetProvider.name)
				)
			} else if (comparisonProviders.length < MAX_COMPARISON_PROVIDERS) {
				// Add to comparison
				onComparisonProvidersChange([...comparisonProviders, targetProvider])
			}
			return
		}

		// Enter to run
		if (key.name === 'return') {
			onRunEstimation()
			return
		}

		// Navigate within focused section
		if (key.name === 'up' || key.name === 'k') {
			if (focusedSection === 'provider') {
				const newIndex = Math.max(0, providerIndex - 1)
				setProviderIndex(newIndex)
				if (filteredProviders[newIndex]) {
					onProviderChange(filteredProviders[newIndex])
				}
			} else if (focusedSection === 'sample') {
				const newIndex = Math.max(0, sampleIndex - 1)
				setSampleIndex(newIndex)
				if (newIndex < SAMPLE_SIZES.length) {
					onSampleSizeChange(SAMPLE_SIZES[newIndex])
				}
			}
		}

		if (key.name === 'down' || key.name === 'j') {
			if (focusedSection === 'provider') {
				const newIndex = Math.min(filteredProviders.length - 1, providerIndex + 1)
				setProviderIndex(newIndex)
				if (filteredProviders[newIndex]) {
					onProviderChange(filteredProviders[newIndex])
				}
			} else if (focusedSection === 'sample') {
				const newIndex = Math.min(SAMPLE_SIZES.length, sampleIndex + 1) // +1 for custom option
				setSampleIndex(newIndex)
				if (newIndex < SAMPLE_SIZES.length) {
					onSampleSizeChange(SAMPLE_SIZES[newIndex])
				} else {
					// Entering custom mode - clear the input
					setCustomSample('')
				}
			}
		}
	})

	return (
		<box flexDirection="column" gap={1} flexGrow={1}>
			{/* Provider Selection + Comparison */}
			<box
				{...panelStyle}
				borderColor={focusedSection === 'provider' ? BLOOMBERG.amber : BLOOMBERG.borderDim}
				title={comparisonProviders.length > 0
					? `MODEL/PROVIDER (${comparisonProviders.length} comparing)`
					: 'MODEL/PROVIDER'}
				titleAlignment="left"
				flexDirection="column"
				flexGrow={1}
			>
				{/* Selected provider preview - at top */}
				<box
					border
					borderColor={BLOOMBERG.borderDim}
					borderStyle="single"
					paddingLeft={1}
					paddingRight={1}
					marginBottom={1}
					flexDirection="column"
				>
					{(() => {
						const selected = filteredProviders[providerIndex]
						if (!selected) return <text fg={BLOOMBERG.textMuted}>No selection</text>
						const cost = getProviderCostStr(selected)
						return (
							<>
								<text fg={BLOOMBERG.text}>
									<strong>{selected.provider}</strong> · {cost}
								</text>
								<text fg={BLOOMBERG.textDim}>
									{selected.notes || '—'}
								</text>
							</>
						)
					})()}
				</box>

				{/* Help text */}
				<text fg={BLOOMBERG.textMuted} marginBottom={1}>
					<em>↑↓ select · Space compare · Enter run</em>
				</text>

				{/* Provider list */}
				{filteredProviders.length === 0 ? (
					<text fg={BLOOMBERG.textMuted}>No providers for {activeTab}</text>
				) : (
					(() => {
						const maxVisible = 7
						const total = filteredProviders.length
						// Calculate window to keep selection visible
						let startIndex = 0
						if (providerIndex >= maxVisible) {
							startIndex = providerIndex - maxVisible + 1
						}
						const endIndex = Math.min(startIndex + maxVisible, total)
						const visibleProviders = filteredProviders.slice(startIndex, endIndex)
						const hiddenAbove = startIndex
						const hiddenBelow = total - endIndex

						return (
							<>
								{hiddenAbove > 0 && (
									<text fg={BLOOMBERG.textMuted}>   ↑ {hiddenAbove} more</text>
								)}
								{visibleProviders.map((provider, i) => {
									const actualIndex = startIndex + i
									const isSelected = actualIndex === providerIndex
									const isInComparison = comparisonProviders.some((p) => p.name === provider.name)
									return (
										<box key={provider.name} flexDirection="row">
											<text fg={isSelected ? BLOOMBERG.amber : BLOOMBERG.textMuted}>
												{isSelected ? '▸' : ' '}
											</text>
											<text fg={isInComparison ? BLOOMBERG.success : BLOOMBERG.textMuted}>
												{isInComparison ? '☑' : '☐'}
											</text>
											<text fg={isSelected ? BLOOMBERG.amberBright : BLOOMBERG.text}>
												{' '}{provider.model}
											</text>
										</box>
									)
								})}
								{hiddenBelow > 0 && (
									<text fg={BLOOMBERG.textMuted}>   ↓ {hiddenBelow} more</text>
								)}
							</>
						)
					})()
				)}
			</box>

			{/* Sample Size */}
			<box
				{...panelStyle}
				borderColor={focusedSection === 'sample' ? BLOOMBERG.amber : BLOOMBERG.borderDim}
				title="SAMPLE SIZE"
				titleAlignment="left"
				flexDirection="column"
			>
				{SAMPLE_SIZES.map((size, i) => {
					const isSelected = i === sampleIndex
					return (
						<box key={size} flexDirection="row">
							<text fg={isSelected ? BLOOMBERG.amber : BLOOMBERG.textMuted}>
								{isSelected ? '▸ ' : '  '}
							</text>
							<text fg={isSelected ? BLOOMBERG.amberBright : BLOOMBERG.text}>
								{size} tracks
							</text>
						</box>
					)
				})}
				{/* Custom option */}
				<box flexDirection="row">
					<text fg={isSampleCustom ? BLOOMBERG.amber : BLOOMBERG.textMuted}>
						{isSampleCustom ? '▸ ' : '  '}
					</text>
					{isSampleCustom ? (
						<text fg={BLOOMBERG.text}>{customSample}{cursorVisible ? '▌' : ' '}</text>
					) : (
						<text fg={BLOOMBERG.textMuted}><em>Custom...</em></text>
					)}
				</box>
			</box>
		</box>
	)
}

function getProviderCostStr(provider: Provider): string {
	if (provider.cost_per_run) {
		return `$${provider.cost_per_run.toFixed(4)}/run`
	}
	if (provider.cost_per_1m_tokens) {
		return `$${provider.cost_per_1m_tokens.toFixed(2)}/1M tok`
	}
	if (provider.input_cost_per_1m_tokens && provider.output_cost_per_1m_tokens) {
		return `$${provider.input_cost_per_1m_tokens.toFixed(2)}/$${provider.output_cost_per_1m_tokens.toFixed(2)}`
	}
	return ''
}
