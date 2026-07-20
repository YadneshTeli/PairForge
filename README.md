# PairForge Platform

> **Tinder for Developers** � Match, connect, and build together.

PairForge is a developer-matching platform that helps engineers find collaborators based on tech stack compatibility, project interests, and coding style.

## Features

- **Smart Matching** � AI-powered compatibility scoring based on skills and interests
- **Real-time Chat & Pair Programming** � Built-in collaboration tools
- **Project Discovery** � Find and join open-source or side projects
- **Event Board** � Hackathons, meetups, and coding events
- **Cross-platform** � Flutter mobile app (Android, iOS, Web)

## My Contribution

I implemented the **AI Matchmaking Service** responsible for generating developer compatibility scores.

Location:
ai-services/matchmaking-service

Key components implemented:

• Skill embeddings using TF-IDF  
• Compatibility scoring using cosine similarity  
• Developer recommendation engine  
• FastAPI-based AI microservice  

Main API endpoints:

GET /health  
Check matchmaking service status.

POST /match/score  
Compute compatibility score between two developers.

GET /match/recommendations/{user_id}  
Return recommended developers based on skill similarity.

## Repository Structure

```text
pairforge-platform/
 docs/                  # Product, architecture & API documentation
 mobile/pairforge-app/  # Flutter cross-platform app
 backend/               # Node.js microservices
 ai-services/           # Python AI matchmaking service
 infrastructure/        # Docker, Kubernetes, Terraform, Monitoring
 database/              # Migrations, seeds, schema
 shared/                # Shared constants, utils, types
 scripts/               # Dev setup & utility scripts
```

## Getting Started

```bash
# Clone the repo
git clone https://github.com/your-org/pairforge-platform.git
cd pairforge-platform

# Run setup
bash scripts/setup.sh

# Start development environment
bash scripts/start-dev.sh
```

## Tech Stack

| Layer | Technology |
| ----- | ----------- |
| Mobile | Flutter / Dart |
| Backend | Node.js, Express, Microservices |
| AI | Python, FastAPI, scikit-learn |
| Database | PostgreSQL, Redis |
| Infra | Docker, Kubernetes, Terraform |
| CI/CD | GitHub Actions |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
