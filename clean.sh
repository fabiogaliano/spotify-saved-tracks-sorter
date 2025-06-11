#!/bin/bash

# Clean script for Spotify Auto-Sort Liked Songs
# This script removes all dependencies and build artifacts

echo "🧹 Cleaning Spotify Auto-Sort Liked Songs..."
echo "=========================================="

# Confirm with user
read -p "This will remove all dependencies and build artifacts. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "📦 Removing web dependencies..."
rm -rf services/web/node_modules
rm -rf services/web/bun.lockb
rm -rf services/web/build
rm -rf services/web/.next
rm -rf services/web/.react-router
rm -rf services/web/node_modules/.cache
rm -rf services/web/.eslintcache
echo "✅ Web dependencies removed"

echo ""
echo "🐍 Removing Python dependencies..."
rm -rf services/vectorization/.venv
rm -rf services/vectorization/__pycache__
find services/vectorization -name "*.pyc" -delete
find services/vectorization -name "__pycache__" -type d -delete
echo "✅ Python dependencies removed"

echo ""
echo "📁 Removing logs and temporary files..."
rm -rf services/web/logs
rm -rf tmp
echo "✅ Logs removed"

echo ""
echo "✅ Clean complete!"
echo ""
echo "To reinstall everything, run:"
echo "  ./setup.sh"
echo ""
echo "Or for individual services:"
echo "  cd services/web && bun install"
echo "  cd services/vectorization && uv pip sync requirements.txt"