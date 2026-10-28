#!/bin/bash
set -e

echo "Applying PairForge migrations..."
(cd backend && npm run migrate)
echo "Rating criteria, role weights, and starter skills are seeded by the migrations."
