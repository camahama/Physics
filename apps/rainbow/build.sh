#!/bin/bash

# Quick build and test script for RainbowSim

set -e

cd "$(dirname "$0")/rainbow_web"

echo "🔨 Building RainbowSim for web..."
pygbag main.py --build web

echo ""
echo "✅ Build complete!"
echo ""
echo "Testing locally..."
echo "📡 Starting web server on http://localhost:8000"
echo "Press Ctrl+C to stop"
echo ""

cd web
python -m http.server 8000
