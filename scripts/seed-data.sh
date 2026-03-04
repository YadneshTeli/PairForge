#!/bin/bash
set -e

echo "Seeding PairForge database..."

PGPASSWORD=password psql -h localhost -U postgres -d pairforge -f database/schema.sql
PGPASSWORD=password psql -h localhost -U postgres -d pairforge -f database/seeds/users.sql
PGPASSWORD=password psql -h localhost -U postgres -d pairforge -f database/seeds/skills.sql

echo "Database seeded successfully."
