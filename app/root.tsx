import { Links, Meta, Outlet, Scripts, ScrollRestoration } from '@remix-run/react'
import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { authenticator } from '~/features/auth/auth.server'
import type { SpotifySession } from '~/features/auth/auth.server'
import { StrictMode } from 'react'
import { Toaster } from '~/shared/components/ui/sonner'

import styles from "./tailwind.css?url"

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
	{ rel: "stylesheet", href: styles },
]

const publicRoutes = ['/', '/about', '/auth/spotify', '/auth/spotify/callback', '/config']

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const pathname = url.pathname

	const session = (await authenticator.isAuthenticated(request)) as SpotifySession | null

	if (!publicRoutes.includes(pathname) && !session) {
		return redirect('/')
	}

	return json({
		isAuthenticated: !!session,
		user: session?.user || null,
	})
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
		<html lang="en" className="text-[100%] 2xl:text-[110%] 3xl:text-[125%]">
			<head>
				<Meta />
				<Links />
			</head>
			<body className="min-h-screen bg-gray-50">
				<main>{children}</main>
				<Toaster richColors position="bottom-right" duration={5000} closeButton={true} />
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
