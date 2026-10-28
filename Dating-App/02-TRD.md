# Technical Requirements Document — PairForge Projects

## 1. Architecture Decision (flagged assumption — confirm before building)

**Assumption: single Express service (monolith) for MVP**, sharing the same PostgreSQL and Redis instances the wider PairForge platform uses, rather than scaffolding directly into the repo's target microservices layout (`backend/` currently implies multiple services + API gateway + Kubernetes).

Reasoning: the rating/scoring model in this feature is unvalidated. Splitting into microservices before real usage data exists means guessing at service boundaries you'll likely redraw. A monolith is trivially extractable into the existing microservices structure later (the repo already has the scaffolding — `infrastructure/`, `docs/architecture/microservices-architecture.md`), so nothing here is thrown away by starting simple.

If you want this scaffolded directly into the microservices structure from day one instead, say so — the schema and API contract below don't change, only the deployment topology and inter-service calls would.

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Backend | Node.js + Express, TypeScript | Matches existing PairForge `backend/` language/framework; TypeScript catches schema/contract drift between client and server at compile time |
| Database | PostgreSQL | Already the platform's DB per `Database Schema (ERD).puml`; relational fits the rating/match/request model well (foreign keys, uniqueness constraints matter here) |
| Cache | Redis | Already used by the platform for match-suggestion caching; reused here for project score caching, same pattern |
| Realtime chat | Socket.IO | Matches the existing `Socket.IO Event Flow` diagram exactly — room-per-match, `join`/`sendMessage`/`messageEvent`/`readMessage`/`leaveRoom` |
| Auth | JWT, matching existing `Users`/`Profiles` pattern in the ERD | No new auth system — reuse whatever the platform already issues |
| Web client | React + Vite, TypeScript | Per established preference; explicitly not Next.js |
| Mobile client | Flutter + Riverpod (MVVM) | Per established preference and existing `mobile/pairforge-app/` scaffold |
| Validation | zod (or equivalent) on the Express layer | Server must reject a ratings payload whose criteria keys don't match the swiper's role — this is the one business rule that must not be trusted to the client |

## 3. Non-Functional Requirements (MVP-appropriate, not aspirational)

- **Performance:** project score reads should hit Redis, not Postgres, on the common path (cache hit). No specific latency SLO for MVP — "feels instant in a demo" is the bar, not a load-tested number.
- **Security:** only the project owner can view/act on their project's `match_requests`. Only an authenticated user can swipe. Admin endpoints (criteria/weights) require an admin role check — reuse whatever role/permission check pattern the platform's auth already has; don't invent a new one.
- **Consistency:** a superlike's `swipes` insert and `match_requests` insert must happen in one DB transaction — a swipe should never exist without its corresponding request, or vice versa.
- **No offline support, no pagination beyond simple cursor/limit on the feed, no rate limiting.** All explicitly out of scope for MVP — add only if asked.

## 4. Environment & Dependencies

Reuse whatever the existing `backend/` already has for: Postgres client (pg/Prisma/Knex — match whatever's already chosen there, don't introduce a second ORM), Redis client, JWT verification middleware, Socket.IO server setup. Do not re-decide these — the point of building inside PairForge is not re-litigating already-made platform choices.

New dependencies this feature specifically needs:
- A schema validation library (zod or equivalent) if the existing backend doesn't already have one.
- Socket.IO client library on both React and Flutter sides (`socket_io_client` package for Flutter).

## 5. Folder Structure (within existing `backend/`)

```
backend/
  src/
    projects/
      projects.routes.ts
      projects.service.ts
      projects.repository.ts
    swipes/
      swipes.routes.ts
      swipes.service.ts        # includes ratings-key validation against active criteria for swiper's role
    matchRequests/
      matchRequests.routes.ts
      matchRequests.service.ts
    scoring/
      scoring.service.ts        # computeProjectScore + Redis cache get/set/invalidate
    admin/
      ratingCriteria.routes.ts
      roleWeights.routes.ts
    chat/
      chat.gateway.ts            # Socket.IO event handlers
```

This nests under the existing backend rather than introducing a new top-level service — consistent with the monolith decision in §1.

## 6. What NOT to build (reiterating PRD out-of-scope, technically)

- No FAISS/vector search, no scikit-learn/XGBoost — `scoring.service.ts` is a SQL aggregate + weighted sum, nothing else.
- No API gateway, no separate microservice for scoring — it's a module in the existing backend.
- No admin UI — just the protected REST endpoints.
