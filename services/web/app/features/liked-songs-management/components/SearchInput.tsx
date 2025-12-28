import { Search, X } from 'lucide-react'

import { Input } from '~/shared/components/ui/input'

interface SearchInputProps {
	value: string
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
	placeholder?: string
}

// Search Input component
export const SearchInput = ({ value, onChange, placeholder }: SearchInputProps) => {
	return (
		<div className="relative">
			<Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
			<Input
				value={value || ''}
				onChange={onChange}
				placeholder={placeholder || 'Search...'}
				className="bg-card border-border text-foreground w-full pl-9"
			/>
			{value && (
				<button
					className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 transform"
					onClick={() =>
						onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>)
					}
				>
					<X className="h-4 w-4" />
				</button>
			)}
		</div>
	)
}
