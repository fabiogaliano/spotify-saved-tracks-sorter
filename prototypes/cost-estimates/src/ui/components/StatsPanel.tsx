/**
 * StatsPanel Component
 *
 * Library statistics sidebar with total, analyzed, and pending counts.
 */

import { BLOOMBERG, panelStyle } from '../theme'

export interface LibraryStats {
	total: number
	analyzed: number
	pending: number
}

interface StatsPanelProps {
	stats: LibraryStats
	isLoading?: boolean
}

export function StatsPanel({ stats, isLoading }: StatsPanelProps) {
	return (
		<box
			{...panelStyle}
			width={28}
			flexDirection="column"
			title="LIBRARY STATS"
			titleAlignment="left"
		>
			<StatRow label="Total" value={stats.total} color={BLOOMBERG.text} />
			<StatRow label="Analyzed" value={stats.analyzed} color={BLOOMBERG.success} />
			<StatRow label="Pending" value={stats.pending} color={BLOOMBERG.warning} />

			{isLoading && (
				<box marginTop={1}>
					<text fg={BLOOMBERG.info}>Loading...</text>
				</box>
			)}
		</box>
	)
}

interface StatRowProps {
	label: string
	value: number
	color: string
}

function StatRow({ label, value, color }: StatRowProps) {
	return (
		<box flexDirection="row" justifyContent="space-between">
			<text fg={BLOOMBERG.textDim}>{label}</text>
			<text fg={color}>
				<strong>{value.toLocaleString()}</strong>
			</text>
		</box>
	)
}
