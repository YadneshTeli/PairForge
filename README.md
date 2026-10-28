# PairForge Platform

> **Tinder for Developers** � Match, connect, and build together.

PairForge is a developer-matching platform. The current app is one Express API: swipe and rate projects by role, see a weighted success score, and chat after the owner accepts. People matching, events, and the Python matchmaking service sit on the same API.

## Features

- **Smart Matching** � AI-powered compatibility scoring based on skills and interests
- **Real-time Chat & Pair Programming** � Built-in collaboration tools
- **Project Discovery** � Find and join open-source or side projects
- **Event Board** � Hackathons, meetups, and coding events
- **Cross-platform** � Flutter mobile app (Android, iOS, Web)

## Repository Structure

```text
pairforge-platform/
 docs/                  # Product, architecture & API documentation
 Dating-App/            # Projects MVP product and technical specs
 mobile/pairforge-app/  # Flutter client
 web/                   # React + Vite client
 backend/               # Express + TypeScript API and SQL migrations
 ai-services/           # Python AI matchmaking service
 infrastructure/        # Docker, Kubernetes, Terraform, Monitoring
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
| Backend | Node.js, Express, TypeScript |
| Web | React, Vite |
| AI | Python, FastAPI, scikit-learn |
| Database | PostgreSQL, Redis |
| Infra | Docker, Kubernetes, Terraform |
| CI/CD | GitHub Actions |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE)
