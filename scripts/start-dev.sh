#!/bin/bash
set -e

echo "Starting PairForge development environment..."

# Start infrastructure (DB, Redis)
docker-compose -f infrastructure/docker/docker-compose.yml up -d postgres redis

# Wait for postgres
echo "Waiting for PostgreSQL to be ready..."
until docker exec $(docker ps -q -f name=postgres) pg_isready -U postgres > /dev/null 2>&1; do
  sleep 1
done

echo "Infrastructure is ready."
echo "  PostgreSQL: localhost:5432"
echo "  Redis:      localhost:6379"
echo ""
echo "Start individual services with:"
echo "  cd backend/api-gateway && npm run dev"
echo "  cd mobile/pairforge-app && flutter run"
