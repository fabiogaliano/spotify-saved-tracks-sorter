#!/bin/bash

# Setup script for Spotify Auto-Sort Liked Songs
# This script installs all dependencies for the project

set -e  # Exit on error

# Check for --clean flag
CLEAN_INSTALL=false
if [[ "$1" == "--clean" ]]; then
    CLEAN_INSTALL=true
fi

echo "🎵 Setting up Spotify Auto-Sort Liked Songs..."
echo "============================================"

# Clean install logic
if [ "$CLEAN_INSTALL" = true ]; then
    echo "🧹 Performing clean install..."
    echo "Removing existing dependencies..."
    
    # Remove web dependencies
    rm -rf services/web/node_modules services/web/bun.lockb
    
    # Remove Python dependencies
    rm -rf services/vectorization/.venv services/vectorization/__pycache__ services/vectorization/*.pyc
    
    echo "✅ Clean complete"
    echo ""
fi

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

# Check if UV is installed
if ! command -v uv &> /dev/null; then
    echo "📦 UV is not installed. Installing UV..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    # Add UV to PATH for current session
    export PATH="$HOME/.cargo/bin:$PATH"
    echo "✅ UV installed"
fi

# Check if python is installed (UV can manage Python for us)
if ! command -v python3 &> /dev/null; then
    echo "📦 Python 3 is not installed. Installing Python 3.11 with UV..."
    uv python install 3.11
fi

echo "✅ Prerequisites check passed"
echo ""

# Install web dependencies
echo "📦 Installing web application dependencies..."
cd services/web
bun install
echo "✅ Web dependencies installed"
echo ""

# Install Python dependencies for vectorization service
echo "🐍 Setting up Python environment with UV..."
cd ../vectorization

# Create .python-version file to specify Python version
echo "3.11" > .python-version

# Create virtual environment with UV
echo "📦 Creating Python virtual environment with UV..."
uv venv --python 3.11

# Install Python dependencies
echo "📦 Installing Python dependencies with UV..."
uv pip sync requirements.txt
echo "✅ Python dependencies installed"

cd ../..

# Create .env file if it doesn't exist
if [ ! -f "services/web/.env" ]; then
    echo "📝 Creating .env file from example..."
    if [ -f ".env.example" ]; then
        cp .env.example services/web/.env
        echo "⚠️  Please update services/web/.env with your actual environment variables"
    else
        echo "⚠️  No .env.example found. Please create services/web/.env with your environment variables"
    fi
fi

# Create logs directory
mkdir -p services/web/logs

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the development environment:"
echo "   cd services/web"
echo "   bun run start-all"
echo ""
echo "📚 Individual commands:"
echo "   - Web app only: bun dev"
echo "   - Workers only: bun run start-worker"
echo "   - WebSocket only: bun run websocket"
echo "   - Vectorization API only: bun run vectorization"
echo ""
echo "⚠️  Remember to:"
echo "   1. Update services/web/.env with your API keys and credentials"
echo "   2. Ensure your database is set up and accessible"
echo "   3. Configure your Spotify app credentials"