#!/bin/bash
set -e

echo "Starting PairForge development environment..."

docker compose -f infrastructure/docker/docker-compose.yml up -d postgres redis

echo "Waiting for PostgreSQL..."
for _ in $(seq 1 30); do
  if docker compose -f infrastructure/docker/docker-compose.yml exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "Infrastructure is ready."
echo "  PostgreSQL: localhost:5432"
echo "  Redis:      localhost:6379"
echo ""
echo "Start the API with:"
echo "  cd backend && npm run dev"
echo "Start Flutter with:"
echo "  cd mobile/pairforge-app && flutter run"
echo "Start the web client with:"
echo "  cd web && npm run dev"
