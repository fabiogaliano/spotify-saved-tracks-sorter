/**
 * CostTable Component
 *
 * Dense data grid showing cost projections at different scales.
 * Includes measurements summary and projections table.
 */

import { BLOOMBERG, panelStyle } from '../theme'
import type { TabType } from './TabBar'
import type { Measurements } from './MeasurementsPanel'
import type { ScaleComparison } from '../../types'

export interface CostProjection {
	tracks: number
	cost: number
	runtime: string
	note?: string
	isHighlighted?: boolean
}

export interface LlmModelCost {
	model: string
	inputCost: number
	outputCost: number
	totalCost: number
	perTrack: number
}

interface CostTableProps {
	type: TabType
	projections: CostProjection[]
	measurements?: Measurements | null
	modelCosts?: LlmModelCost[]
	isLoading?: boolean
}

export function CostTable({ type, projections, measurements, modelCosts, isLoading }: CostTableProps) {
	// Hide entirely until we have results
	if (!isLoading && projections.length === 0 && !measurements) {
		return null
	}

	if (isLoading) {
		return (
			<box {...panelStyle} title="PROJECTIONS" titleAlignment="left" flexGrow={1}>
				<text fg={BLOOMBERG.info}>Calculating...</text>
			</box>
		)
	}

	return (
		<box {...panelStyle} title="PROJECTIONS" titleAlignment="left" flexGrow={1} flexDirection="column">
			{/* Measurements summary */}
			{measurements && <MeasurementsSummary data={measurements} />}

			{/* Scale projections table */}
			<ProjectionsTable projections={projections} />

			{/* LLM model comparison (only for LLM tab) */}
			{type === 'llm' && modelCosts && modelCosts.length > 0 && (
				<box marginTop={1} flexDirection="column">
					<text fg={BLOOMBERG.amber}>
						<strong>MODEL COMPARISON (per 1K tracks)</strong>
					</text>
					<ModelCostsTable costs={modelCosts} />
				</box>
			)}
		</box>
	)
}

function MeasurementsSummary({ data }: { data: Measurements }) {
	if (data.type === 'vectorization') {
		return (
			<box
				border
				borderColor={BLOOMBERG.borderDim}
				borderStyle="single"
				paddingLeft={1}
				paddingRight={1}
				marginBottom={1}
				flexDirection="column"
			>
				<text fg={BLOOMBERG.text}>
					<strong>Sample size:</strong> {data.sampleSize} tracks
				</text>
				<text fg={BLOOMBERG.textDim}>
					Avg chars: {data.avgTextLength.toLocaleString()} · Avg tokens: ~{data.avgTokens.toLocaleString()}
				</text>
			</box>
		)
	}

	return (
		<box
			border
			borderColor={BLOOMBERG.borderDim}
			borderStyle="single"
			paddingLeft={1}
			paddingRight={1}
			marginBottom={1}
			flexDirection="column"
		>
			<text fg={BLOOMBERG.text}>
				<strong>Sample size:</strong> {data.sampleSize} tracks
			</text>
			<text fg={BLOOMBERG.textDim}>
				Input: ~{data.avgInputTokens.toLocaleString()} · Output: ~{data.avgOutputTokens.toLocaleString()}
			</text>
		</box>
	)
}

function ProjectionsTable({ projections }: { projections: CostProjection[] }) {
	// Column widths
	const COL_TRACKS = 10
	const COL_COST = 12
	const COL_RUNTIME = 10
	const COL_NOTE = 20

	return (
		<box flexDirection="column">
			{/* Header row */}
			<box flexDirection="row">
				<text fg={BLOOMBERG.tableHeader}>
					<strong>{pad('TRACKS', COL_TRACKS)}</strong>
				</text>
				<text fg={BLOOMBERG.tableHeader}>
					<strong>{pad('COST', COL_COST)}</strong>
				</text>
				<text fg={BLOOMBERG.tableHeader}>
					<strong>{pad('RUNTIME', COL_RUNTIME)}</strong>
				</text>
				{/* Empty header for note column */}
				<text fg={BLOOMBERG.tableHeader}>{pad('', COL_NOTE)}</text>
			</box>

			{/* Separator */}
			<text fg={BLOOMBERG.borderDim}>{'─'.repeat(COL_TRACKS + COL_COST + COL_RUNTIME + COL_NOTE)}</text>

			{/* Data rows */}
			{projections.map((row, i) => (
				<box
					key={i}
					flexDirection="row"
					backgroundColor={row.isHighlighted ? BLOOMBERG.tableRowHighlight : i % 2 === 1 ? BLOOMBERG.tableRowAlt : undefined}
				>
					<text fg={row.isHighlighted ? BLOOMBERG.amber : BLOOMBERG.text}>
						{pad(row.tracks.toLocaleString(), COL_TRACKS)}
					</text>
					<text fg={row.isHighlighted ? BLOOMBERG.amber : BLOOMBERG.text}>
						{pad(formatCurrency(row.cost), COL_COST)}
					</text>
					<text fg={row.isHighlighted ? BLOOMBERG.amber : BLOOMBERG.textDim}>
						{pad(row.runtime, COL_RUNTIME)}
					</text>
					<text fg={row.isHighlighted ? BLOOMBERG.amber : BLOOMBERG.textMuted}>
						{pad(row.note || '', COL_NOTE)}
					</text>
				</box>
			))}
		</box>
	)
}

function ModelCostsTable({ costs }: { costs: LlmModelCost[] }) {
	const COL_MODEL = 26
	const COL_INPUT = 9
	const COL_OUTPUT = 9
	const COL_TOTAL = 9
	const COL_PERTRACK = 10

	return (
		<box flexDirection="column" marginTop={1}>
			{/* Header */}
			<box flexDirection="row">
				<text fg={BLOOMBERG.tableHeader}>
					<strong>{pad('MODEL', COL_MODEL)}</strong>
				</text>
				<text fg={BLOOMBERG.tableHeader}>
					<strong>{pad('INPUT', COL_INPUT)}</strong>
				</text>
				<text fg={BLOOMBERG.tableHeader}>
					<strong>{pad('OUTPUT', COL_OUTPUT)}</strong>
				</text>
				<text fg={BLOOMBERG.tableHeader}>
					<strong>{pad('TOTAL', COL_TOTAL)}</strong>
				</text>
				<text fg={BLOOMBERG.tableHeader}>
					<strong>{pad('$/TRACK', COL_PERTRACK)}</strong>
				</text>
			</box>

			<text fg={BLOOMBERG.borderDim}>
				{'─'.repeat(COL_MODEL + COL_INPUT + COL_OUTPUT + COL_TOTAL + COL_PERTRACK)}
			</text>

			{/* Rows */}
			{costs.map((row, i) => (
				<box key={i} flexDirection="row" backgroundColor={i % 2 === 1 ? BLOOMBERG.tableRowAlt : undefined}>
					<text fg={BLOOMBERG.text}>{pad(row.model, COL_MODEL)}</text>
					<text fg={BLOOMBERG.textDim}>{pad(formatCurrency(row.inputCost), COL_INPUT)}</text>
					<text fg={BLOOMBERG.textDim}>{pad(formatCurrency(row.outputCost), COL_OUTPUT)}</text>
					<text fg={BLOOMBERG.text}>{pad(formatCurrency(row.totalCost), COL_TOTAL)}</text>
					<text fg={BLOOMBERG.textDim}>{pad(`$${row.perTrack.toFixed(5)}`, COL_PERTRACK)}</text>
				</box>
			))}
		</box>
	)
}

/**
 * ComparisonTable Component
 *
 * Matrix showing costs at key scale points across multiple providers.
 * Rows = scale levels (same as projections)
 * Columns = selected providers
 */
interface ComparisonTableProps {
	comparisons: ScaleComparison[]
	measurements?: Measurements | null
	isLoading?: boolean
}

export function ComparisonTable({ comparisons, measurements, isLoading }: ComparisonTableProps) {
	if (isLoading) {
		return (
			<box {...panelStyle} title="MODEL COMPARISON" titleAlignment="left">
				<text fg={BLOOMBERG.info}>Calculating comparisons...</text>
			</box>
		)
	}

	if (comparisons.length === 0) {
		return null
	}

	// Get providers from first comparison row
	const providers = comparisons[0]?.costs.map((c) => c.provider) ?? []
	if (providers.length === 0) return null

	// Column widths - give more space to model names
	const COL_TRACKS = 10
	const remainingWidth = 58 - COL_TRACKS // Fit in 68 char panel with padding
	const COL_COST = Math.floor(remainingWidth / providers.length)

	// Get short distinguishing name for provider
	const getShortName = (provider: typeof providers[0]) => {
		// Use model name, but try to make it unique
		const model = provider.model
		// Remove common prefixes
		const cleaned = model
			.replace('text-embedding-', 'embed-')
			.replace('-latest', '')
			.replace('-preview', '')
		return cleaned
	}

	return (
		<box {...panelStyle} title="MODEL COMPARISON" titleAlignment="left" flexDirection="column">
			{/* Measurements summary (same as CostTable) */}
			{measurements && <MeasurementsSummary data={measurements} />}

			{/* Model name header - each on its own line for clarity */}
			<box flexDirection="column" marginBottom={1}>
				{providers.map((p, i) => (
					<text key={p.name} fg={BLOOMBERG.tableHeader}>
						<strong>[{i + 1}]</strong> <span fg={BLOOMBERG.text}>{p.model}</span>
					</text>
				))}
			</box>

			{/* Cost table header */}
			<box flexDirection="row">
				<text fg={BLOOMBERG.tableHeader}>
					<strong>{pad('TRACKS', COL_TRACKS)}</strong>
				</text>
				{providers.map((_, i) => (
					<text key={i} fg={BLOOMBERG.tableHeader}>
						<strong>{pad(`[${i + 1}]`, COL_COST)}</strong>
					</text>
				))}
			</box>

			{/* Separator */}
			<text fg={BLOOMBERG.borderDim}>
				{'─'.repeat(COL_TRACKS + COL_COST * providers.length)}
			</text>

			{/* Data rows */}
			{comparisons.map((row, i) => (
				<box
					key={row.tracks}
					flexDirection="row"
					backgroundColor={row.isHighlighted ? BLOOMBERG.tableRowHighlight : i % 2 === 1 ? BLOOMBERG.tableRowAlt : undefined}
				>
					<text fg={row.isHighlighted ? BLOOMBERG.amber : BLOOMBERG.text}>
						{pad(row.tracks.toLocaleString(), COL_TRACKS)}
					</text>
					{row.costs.map((cost) => (
						<text
							key={cost.provider.name}
							fg={row.isHighlighted ? BLOOMBERG.amber : BLOOMBERG.text}
						>
							{pad(formatCurrency(cost.cost), COL_COST)}
						</text>
					))}
				</box>
			))}
		</box>
	)
}

// Helpers
function pad(str: string, width: number): string {
	return str.padEnd(width)
}

function formatCurrency(amount: number): string {
	if (amount < 0.01) return `$${amount.toFixed(4)}`
	if (amount < 1) return `$${amount.toFixed(2)}`
	return `$${amount.toFixed(2)}`
}
