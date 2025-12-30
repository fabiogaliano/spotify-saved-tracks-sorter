/**
 * MeasurementsPanel Component
 *
 * Displays measurement data for the current estimation type.
 * Shows sample size, average text/prompt length, and token estimates.
 */

import { BLOOMBERG, panelStyle } from '../theme'

export interface VectorizationMeasurements {
	type: 'vectorization'
	sampleSize: number
	avgTextLength: number
	avgTokens: number
}

export interface LlmMeasurements {
	type: 'llm'
	sampleSize: number
	successRate: number
	avgPromptLength: number
	avgInputTokens: number
	avgOutputTokens: number
}

export type Measurements = VectorizationMeasurements | LlmMeasurements

interface MeasurementsPanelProps {
	data: Measurements | null
	isLoading?: boolean
}

export function MeasurementsPanel({ data, isLoading }: MeasurementsPanelProps) {
	if (isLoading) {
		return (
			<box {...panelStyle} title="MEASUREMENTS" titleAlignment="left">
				<text fg={BLOOMBERG.info}>Measuring...</text>
			</box>
		)
	}

	if (!data) {
		return (
			<box {...panelStyle} title="MEASUREMENTS" titleAlignment="left">
				<text fg={BLOOMBERG.textMuted}>No data yet</text>
			</box>
		)
	}

	return (
		<box {...panelStyle} title="MEASUREMENTS" titleAlignment="left" flexDirection="column">
			{data.type === 'vectorization' ? (
				<VectorizationView data={data} />
			) : (
				<LlmView data={data} />
			)}
		</box>
	)
}

function VectorizationView({ data }: { data: VectorizationMeasurements }) {
	return (
		<>
			<MeasurementRow label="Sample Size" value={`${data.sampleSize} tracks`} />
			<MeasurementRow label="Avg Text" value={`${data.avgTextLength.toLocaleString()} chars`} />
			<MeasurementRow label="Avg Tokens" value={`~${data.avgTokens.toLocaleString()}`} />
		</>
	)
}

function LlmView({ data }: { data: LlmMeasurements }) {
	const successPct = Math.round(data.successRate * 100)
	const successColor = successPct >= 80 ? BLOOMBERG.success : successPct >= 50 ? BLOOMBERG.warning : BLOOMBERG.error

	return (
		<>
			<MeasurementRow label="Sample Size" value={`${data.sampleSize} tracks`} />
			<box flexDirection="row" justifyContent="space-between">
				<text fg={BLOOMBERG.textDim}>Success Rate</text>
				<text fg={successColor}>
					<strong>{successPct}%</strong>
				</text>
			</box>
			<MeasurementRow label="Avg Prompt" value={`${data.avgPromptLength.toLocaleString()} chars`} />
			<MeasurementRow label="Input Tokens" value={`~${data.avgInputTokens.toLocaleString()}`} />
			<MeasurementRow label="Output Tokens" value={`~${data.avgOutputTokens.toLocaleString()}`} />
		</>
	)
}

function MeasurementRow({ label, value }: { label: string; value: string }) {
	return (
		<box flexDirection="row" justifyContent="space-between">
			<text fg={BLOOMBERG.textDim}>{label}</text>
			<text fg={BLOOMBERG.text}>{value}</text>
		</box>
	)
}
