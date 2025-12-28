import React from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

// Create a client with sensible defaults
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Data is considered fresh for 2 minutes
			staleTime: 2 * 60 * 1000,
			// Cache data for 10 minutes
			gcTime: 10 * 60 * 1000,
			// Retry failed requests 3 times with exponential backoff
			retry: (failureCount, error: any) => {
				if (error?.status === 404) return false
				if (error?.status === 401) return false
				return failureCount < 2
			},
			refetchOnWindowFocus: process.env.NODE_ENV === 'production',
		},
		mutations: {
			retry: 0,
		},
	},
})

interface QueryProviderProps {
	children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{process.env.NODE_ENV === 'development' && (
				<ReactQueryDevtools
					initialIsOpen={false}
					position="bottom"
					buttonPosition="bottom-right"
				/>
			)}
		</QueryClientProvider>
	)
}

export { queryClient }
