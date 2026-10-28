# Implementation Plan — PairForge Projects

Written so an AI coding agent (Cursor, Claude Code, Lovable, Bolt, Replit, etc.) can execute phase by phase, verifying each before moving on. Each phase lists concrete tasks and a verification step — don't proceed to the next phase until verification passes.

## Phase 0 — Schema & Admin Config

**Tasks:**
1. Run migrations for `rating_criteria`, `role_weights`, `projects`, `swipes`, `match_requests`, `matches`, `messages` (see `05-Backend-Schema.md`). Add `role` column to `profiles` if missing.
2. Seed `rating_criteria` and `role_weights` with the starting data in the schema doc.
3. Build admin endpoints: `GET/POST/PATCH/DELETE /admin/rating-criteria`, `GET/PATCH /admin/role-weights`, gated by an admin role check (reuse existing auth/role-check pattern — don't build a new permission system).

**Verify:**
- Migrations apply cleanly against the existing PairForge database without touching pre-existing tables.
- An admin token can list/edit criteria and weights; a non-admin token gets 403.
- Seed data matches the table in `05-Backend-Schema.md` exactly.

## Phase 1 — Core Feature on One Client (recommend web/React first)

**Tasks:**
1. Backend: `POST /projects`, `GET /projects/feed?role=`, `GET /projects/:id`.
2. Backend: `POST /projects/:id/swipe` — validates `ratings` keys against active `rating_criteria` for the swiper's role (reject unknown/missing keys on like/superlike; ignore ratings entirely on pass). On superlike, insert `swipes` + `match_requests` in one transaction. Invalidate the project's Redis score cache after any like/superlike.
3. Backend: `GET /projects/:id/score` — Redis cache-first (15 min TTL), falls back to the SQL aggregate in `05-Backend-Schema.md` §3 on miss.
4. Frontend (React): Feed screen, Rating Overlay, Project Detail, Post a Project, My Projects (showing live score) — per `04-UIUX-Brief.md`.

**Verify:**
- A test project rated by 3+ different roles produces a score that changes immediately after each new rating (confirms cache invalidation is wired correctly, not just TTL expiry).
- Hand-computing the weighted average for a small test case matches what the API returns.
- Submitting a ratings payload with a criterion key from the wrong role is rejected by the server, not silently accepted.
- Pass requires no rating input at all.

## Phase 2 — Port to Flutter

**Tasks:**
1. Build the same 9 screens in Flutter + Riverpod (MVVM), calling the same backend API validated in Phase 1.
2. No new backend endpoints — this phase is client-only.

**Verify:**
- Feature parity checklist against the Phase 1 web client: every screen, every action, same empty states.

## Phase 3 — Mutual Approval & Chat

**Tasks:**
1. Backend: `GET /projects/:id/requests` (owner-only), `PATCH /match-requests/:id` (owner-only — accept creates a `matches` row, decline just updates status).
2. Backend: Socket.IO gateway — `connect`, `join(matchRoom)`, `sendMessage` (persists to `messages` then broadcasts `messageEvent`), `readMessage`, `leaveRoom`. Matches the existing PairForge `Socket.IO Event Flow` diagram exactly.
3. Frontend (both clients): Requests Inbox, Matches/Chat List, Chat Thread — per `04-UIUX-Brief.md` and `03-App-Flow.md` §4–5.

**Verify:**
- Two test accounts: account A superlikes account B's project, B sees the request with A's submitted ratings visible, B accepts, both A and B can exchange messages live over the socket connection.
- A declined request never creates a `matches` row and neither client can open a chat for it.
- A non-owner cannot see or act on another owner's requests (403/404 as appropriate).

## Phase 4 — Polish

**Tasks:**
1. Empty states for all 5 screens listed in `04-UIUX-Brief.md` §4.
2. Project edit/delete (owner-only).
3. Basic moderation: ability for a user to report a project or another user (storage only — no moderation workflow/admin review screen required for MVP; just capture the report).

**Verify:**
- Every empty state renders correctly with zero seed data.
- Owner can edit/delete their own project; non-owner gets 403 attempting to.
- A report is persisted and retrievable via a basic query — no UI required to review it yet.

## Explicit Non-Goals for This Plan (see PRD §4 for full list)

Do not add during any phase unless the person building this explicitly asks: AI/ML matching, microservices split, admin UI, push notifications, payments, pair programming, event board, GitHub integration.
