import type { LinksFunction, LoaderFunctionArgs, MetaFunction } from 'react-router';
import { redirect } from 'react-router';
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import { StrictMode } from 'react'
import { getUserSession } from '~/features/auth/auth.utils'
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
	isAuthenticated: boolean;
	spotifyUser: {
		id: string;
		email: string;
		name: string;
		image?: string;
	} | null;
	appUser: {
		id: number;
		hasSetupCompleted: boolean;
	} | null;
}

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const pathname = url.pathname

	const sessionData = await getUserSession(request)
	const isAuthenticated = !!sessionData

	if (!publicRoutes.includes(pathname) && !isAuthenticated) {
		return redirect('/')
	}

	return Response.json({
		isAuthenticated,
		spotifyUser: sessionData?.spotifyUser || null,
		appUser: sessionData ? {
			id: sessionData.userId,
			hasSetupCompleted: sessionData.hasSetupCompleted
		} : null,
	} as RootLoaderData)
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
