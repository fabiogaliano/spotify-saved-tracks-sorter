import { StrictMode } from 'react'

import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from 'react-router'
import { Links, Meta, Outlet, Scripts, ScrollRestoration, redirect } from 'react-router'

import {
	createResponseWithUpdatedSession,
	getUserSession,
} from '~/features/auth/auth.utils'
import { QueryProvider } from '~/lib/providers/query-provider'
import { ThemeProvider } from '~/lib/providers/theme-provider'
import { Toaster } from '~/shared/components/ui/sonner'

import './tailwind.css'

export const links: LinksFunction = () => [
	{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
	{
		rel: 'preconnect',
		href: 'https://fonts.gstatic.com',
		crossOrigin: 'anonymous',
	},
	{
		rel: 'stylesheet',
		href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
	},
]

const publicRoutes = ['/', '/about', '/auth/spotify', '/auth/spotify/callback', '/config']

export type RootLoaderData = {
	isAuthenticated: boolean
	spotifyUser: {
		id: string
		email: string
		name: string
		image?: string
	} | null
	appUser: {
		id: number
		hasSetupCompleted: boolean
	} | null
}

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const pathname = url.pathname

	const sessionData = await getUserSession(request)
	const isAuthenticated = !!sessionData

	if (!publicRoutes.includes(pathname) && !isAuthenticated) {
		return redirect('/')
	}

	const responseData: RootLoaderData = {
		isAuthenticated,
		spotifyUser: sessionData?.spotifyUser || null,
		appUser:
			sessionData ?
				{
					id: sessionData.userId,
					hasSetupCompleted: sessionData.hasSetupCompleted,
				}
			:	null,
	}

	return createResponseWithUpdatedSession(responseData, sessionData)
}

export const meta: MetaFunction = () => {
	return [
		{ charSet: 'utf-8' },
		{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
		{ title: 'spotify liked songs - ai sorter' },
	]
}

export function Layout({ children }: { children: React.ReactNode }) {
	return (
		<html
			lang="en"
			className="3xl:text-[125%] text-[100%] 2xl:text-[110%]"
			suppressHydrationWarning
		>
			<head>
				<Meta />
				<Links />
			</head>
			<body className="min-h-screen">
				<QueryProvider>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						enableSystem
						disableTransitionOnChange={false}
					>
						<main>{children}</main>
						<Toaster
							richColors
							position="bottom-right"
							duration={5000}
							closeButton={true}
						/>
					</ThemeProvider>
				</QueryProvider>
				<ScrollRestoration />
				<Scripts />
			</body>
		</html>
	)
}

export default function App() {
	return (
		<StrictMode>
			<Outlet />
		</StrictMode>
	)
}
