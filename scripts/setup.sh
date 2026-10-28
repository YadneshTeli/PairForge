#!/bin/bash
set -e

echo "Setting up PairForge development environment..."

command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed."; exit 1; }
command -v flutter >/dev/null 2>&1 || { echo "Flutter is required but not installed."; exit 1; }

echo "Installing backend dependencies..."
(cd backend && npm install)

if [ -f web/package.json ]; then
  echo "Installing web dependencies..."
  (cd web && npm install)
fi

echo "Installing AI service dependencies..."
(cd ai-services/matchmaking-service && pip install -r requirements.txt -q)

echo "Installing Flutter dependencies..."
(cd mobile/pairforge-app && flutter pub get)

echo "Setup complete. Run ./scripts/start-dev.sh to start Postgres and Redis."
