#!/bin/bash
set -e

echo "Setting up PairForge development environment..."

# Check dependencies
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed."; exit 1; }
command -v flutter >/dev/null 2>&1 || { echo "Flutter is required but not installed."; exit 1; }

# Install backend dependencies
echo "Installing backend dependencies..."
for service in api-gateway auth-service user-service match-service chat-service project-service event-service notification-service; do
  if [ -f "backend/$service/package.json" ]; then
    echo "  -> $service"
    (cd "backend/$service" && npm install --silent)
  fi
done

# Install AI service dependencies
echo "Installing AI service dependencies..."
(cd ai-services/matchmaking-service && pip install -r requirements.txt -q)

# Install Flutter dependencies
echo "Installing Flutter dependencies..."
(cd mobile/pairforge-app && flutter pub get)

echo "Setup complete! Run ./scripts/start-dev.sh to start."
