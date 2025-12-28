import { ReactNode } from 'react'

import { Card, CardContent } from '~/shared/components/ui/Card'

interface StylesType {
	card: string
	iconContainer: string
}

// Common styles
const styles: StylesType = {
	card: 'bg-card border-border',
	iconContainer: 'p-2 rounded-full',
}

interface StatusCardProps {
	title: string
	value: number
	icon: ReactNode
	iconBg?: string
	valueColor?: string
	description?: string
}

// Status Card component
export const StatusCard = ({
	title,
	value,
	icon,
	iconBg,
	valueColor = 'text-foreground',
	description,
}: StatusCardProps) => {
	return (
		<Card className={styles.card}>
			<CardContent className="flex items-center justify-between p-4">
				<div>
					<p className="text-muted-foreground text-sm">{title}</p>
					<p className={`${valueColor} text-2xl font-bold`}>{value}</p>
					{description && (
						<p className="text-muted-foreground mt-1 text-xs">{description}</p>
					)}
				</div>
				<div className={`${iconBg || 'bg-card'} ${styles.iconContainer}`}>{icon}</div>
			</CardContent>
		</Card>
	)
}
