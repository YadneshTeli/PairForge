# PairForge

PairForge matches people who want to build together. You pick a role, rate projects from that seat, and connect when the interest is mutual. A superlike asks the project owner to accept. A mutual like between people opens a chat. From a match you can write in a shared document and start a call.

The same product runs in two clients against one API:

- **Web** (`web/`) is a React and Vite app. It uses a rose, block-based interface: a side rail on desktop and a floating dock on a phone.
- **Mobile** (`mobile/pairforge-app/`) is a Flutter app for Android, iOS, and web, with the same rose system and a floating bottom dock.

## What you can do

- Sign up, then choose a role once: founder, cofounder, VC, developer, freelancer, or student.
- Swipe a project feed. A like or superlike scores the idea on the criteria for your role. Owners see a success score from those ratings.
- Post and edit your own projects, review join requests, and manage the team.
- Swipe people, open a profile, and see a compatibility score.
- Chat in real time. A pair session keeps a shared document in sync and can start video on the call.
- Post and join meetups.
- Read in-app notifications and edit your profile, skills, and GitHub username.

## Repository

```text
web/                   React + Vite client
mobile/pairforge-app/  Flutter client
backend/               Express + TypeScript API, SQL migrations, Socket.IO
ai-services/           Python matchmaking service
infrastructure/        Docker Compose, Kubernetes, Terraform, monitoring
scripts/               Setup and local Postgres/Redis helpers
docs/                  Product and API notes
```

## Tech stack

| Layer | Technology |
| ----- | ---------- |
| Web | React 18, TypeScript, Vite, TanStack Query, React Router |
| Mobile | Flutter, Riverpod, go_router |
| API | Node.js, Express, TypeScript, Socket.IO, JWT |
| Matchmaking | Python, FastAPI, TF-IDF embeddings, cosine similarity |
| Data | PostgreSQL 16, Redis 7 |
| Infra | Docker Compose |

## Run it locally

You need Node.js, Docker, and npm. Flutter is only required for the mobile app. Python is only required if you run the matchmaking service outside Docker.

### 1. Install dependencies

```bash
cd backend && npm install
cd ../web && npm install
```

Flutter, from `mobile/pairforge-app`:

```bash
flutter pub get
```

On macOS or Linux, `bash scripts/setup.sh` does these installs and also installs the Python service.

### 2. Start Postgres and Redis

From the repository root:

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d postgres redis
```

Postgres listens on `localhost:5432` (`postgres` / `password`, database `pairforge`). Redis listens on `localhost:6379`.

`bash scripts/start-dev.sh` starts the same two containers.

### 3. Start the API

```bash
cd backend
copy .env.example .env   # Windows
# cp .env.example .env   # macOS / Linux
npm run dev
```

The API listens on [http://localhost:3000](http://localhost:3000). On startup it runs SQL migrations. Set `JWT_SECRET` in `.env` before you share a deployment. `CORS_ORIGIN=*` is the local default.

### 4. Start a client

Web, at [http://localhost:5173](http://localhost:5173):

```bash
cd web
npm run dev
```

The web client calls `http://localhost:3000/api` unless `VITE_API_URL` is set.

Flutter:

```bash
cd mobile/pairforge-app
flutter run
```

### Matchmaking service

Compatibility can call the Python service at `MATCHMAKING_URL` (default `http://localhost:8000`). Its routes:

| Method | Path | Purpose |
| ------ | ---- | ------- |
| GET | `/health` | Service status |
| POST | `/match/score` | Compatibility score for two people |
| GET | `/match/recommendations/{user_id}` | Suggested people from skill similarity |
| POST | `/match/feedback` | Record a match outcome |

Docker Compose can build it with the API:

```bash
docker compose -f infrastructure/docker/docker-compose.yml up -d --build api matchmaking-service
```

That image runs the API on port 3000 and matchmaking on port 8000, using the Postgres and Redis containers. For day-to-day UI work, Postgres and Redis in Docker plus `npm run dev` in `backend/` is enough.

## Clients

Both clients cover the same flows: sign in, sign up, role onboarding, project feed, your projects, requests, matches, chat, pair session, people, profile, events, and notifications.

Web scripts:

```bash
cd web
npm run dev      # Vite
npm run build    # typecheck and production build
```

API scripts:

```bash
cd backend
npm run dev      # tsx watch
npm run migrate  # migrations only
npm test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
