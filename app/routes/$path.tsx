import { LoaderFunction, MetaFunction } from 'react-router';
import { Link, useRouteError } from 'react-router';
import React from 'react';

export const meta: MetaFunction = () => {
  return [
    { title: '404 - Page Not Found | Sorted' },
    { name: 'description', content: 'The page you are looking for does not exist.' },
  ];
};

export const loader: LoaderFunction = async () => {
  return new Response('404 Not Found', { status: 404 });
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-theme-gradient text-foreground flex flex-col">
      {/* Nav */}
      <nav className="sticky top-0 z-10 flex justify-between items-center px-6 py-5 md:px-12 backdrop-blur-sm bg-background/50 border-b border-border/50">
        <div className="flex items-center">
          <Link to="/" className="text-2xl md:text-3xl font-bold bg-gradient-brand">
            Sorted.
          </Link>
        </div>
      </nav>

      {/* 404 Content */}
      <div className="flex-grow flex items-center justify-center px-6 md:px-12 py-12">
        <div className="max-w-3xl mx-auto bg-background/30 backdrop-blur-sm rounded-2xl p-10 border border-border text-center relative overflow-hidden">
          {/* Glow effects */}
          <div className="absolute -top-20 -left-10 w-64 h-64 bg-purple-500 rounded-full filter blur-3xl opacity-10"></div>
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-blue-500 rounded-full filter blur-3xl opacity-10"></div>

          <div className="relative z-10">
            <div className="text-9xl font-bold bg-gradient-brand opacity-80 mb-6">404</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Page Not Found</h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-10">
              The page you're looking for doesn't exist or has been moved.
            </p>
            <Link
              to="/"
              className="bg-green-500 hover:bg-green-400 transition-all text-foreground text-xl px-10 py-4 rounded-full font-medium inline-block text-center"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-background/50 backdrop-blur-md border-t border-border py-8">
        <div className="container mx-auto px-6 md:px-12">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="text-xl md:text-2xl font-bold bg-gradient-brand">
                Sorted.
              </div>
              <div className="text-muted-foreground text-sm mt-2">From likes to perfect playlists.</div>
            </div>
            <div className="text-center text-muted-foreground/70 text-sm">
              2025 Sorted. Not affiliated with Spotify. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
