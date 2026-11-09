#!/bin/bash
# NagrikAI Startup Script
set -e

echo "🏛️  Starting NagrikAI Platform..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check if .env has a valid Gemini key
GEMINI_KEY=$(grep GEMINI_API_KEY "$SCRIPT_DIR/backend/.env" 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
if [[ -z "$GEMINI_KEY" ]] || [[ "$GEMINI_KEY" != AIzaSy* ]]; then
    echo "⚠️  NOTE: No valid Gemini API key found in backend/.env"
    echo "   Running in DEMO MODE — real government scheme data will be shown"
    echo "   To enable live AI: update GEMINI_API_KEY in backend/.env with a key"
    echo "   from https://aistudio.google.com/app/apikey (project 668162623173)"
    echo ""
fi

# Start Backend
echo "🚀 Starting Backend (FastAPI on port 8000)..."
cd "$SCRIPT_DIR/backend"
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

sleep 4

# Start Frontend
echo "🚀 Starting Frontend (Next.js on port 3000)..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

echo ""
echo "=================================================="
echo "🏛️  NagrikAI is starting up!"
echo "=================================================="
echo ""
echo "  Citizen Portal:    http://localhost:3000"
echo "  Admin Dashboard:   http://localhost:3000/admin"
echo "  API Docs:          http://localhost:8000/docs"
echo "  API Health:        http://localhost:8000/health"
echo ""
echo "  Admin Login:"
echo "    Email:    admin@civicai.gov.in"
echo "    Password: Admin@NagrikAI2024"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

trap "echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
