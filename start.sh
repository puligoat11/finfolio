#!/bin/zsh
cd "$(dirname "$0")"

# Kill anything already on these ports
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null

echo "🚀 Starting FinFolio..."
npm run dev:full &

# Wait for Vite to be ready, then open the browser
until curl -s http://localhost:3000 > /dev/null 2>&1; do sleep 0.5; done
open http://localhost:3000
echo "✅ Open at http://localhost:3000"

wait
