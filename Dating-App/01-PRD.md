# Product Requirements Document — PairForge Projects

## 1. Problem Statement

Founders, cofounders, VCs, developers, freelancers, and students all evaluate early-stage projects and ideas constantly — but informally, in DMs, group chats, and pitch decks with no structured feedback loop. There's no fast, low-friction way for a project owner to get a directional signal ("would people with relevant expertise actually back/build/join this?") or to find collaborators who've already signaled genuine interest.

PairForge Projects is a swipe-based discovery and rating layer, extending the PairForge platform (`github.com/YadneshTeli/PairForge`), that lets each type of user rate a project through criteria relevant to their own role, produces a directional "success likelihood" score for the project owner, and lets a genuinely interested user request to connect — with the owner controlling who they actually talk to.

## 2. Target Users / Personas

| Persona | What they're doing here | What they care about rating |
|---|---|---|
| Founder | Posting an idea/project, seeking cofounders or feedback | Sees ratings from everyone else |
| Cofounder-seeker | Browsing for a project to join as a cofounder | Idea originality, founder-market fit, would-I-cofound |
| VC | Scouting early signal on projects before formal pitches | Market size, monetization path, investability |
| Developer | Looking for a technically interesting project to build | Technical feasibility, scope clarity, would-I-build-this |
| Freelancer | Looking for paid or equity-based engagement | Project clarity, fair scope, would-I-take-this-on |
| Student | Looking for learning opportunities / résumé projects | Learning value, personal interest, approachability |

Every user has exactly one role at signup (matches the existing PairForge `profiles.role` pattern). Role determines both which rating criteria they see when swiping and which weight their rating carries in the project's overall score.

## 3. MVP Scope (in scope)

1. **Post a project** — title, tagline, description, stage (idea/prototype/mvp/launched), tags, what you're looking for (cofounder/funding/developer/etc.).
2. **Swipe feed** — pass, like, or superlike a project. Like/superlike require submitting scores (1–5) on the 3 rating criteria defined for the swiper's role.
3. **Success score** — a single weighted number per project, visible to the owner, computed from all like/superlike ratings, weighted by rater role.
4. **Mutual-approval connection flow** — superliking a project sends the owner a connection request; the owner explicitly accepts or declines. Chat only opens on acceptance.
5. **Real-time chat** — once accepted, requester and owner can message each other (Socket.IO, matching the existing PairForge chat pattern).
6. **Admin-manageable rating criteria and role weights** — criteria and weights live in the database and are editable via protected endpoints, not hardcoded, so they can be tuned without a redeploy.
7. **Both web (React) and mobile (Flutter) clients**, backed by one shared API.

## 4. Explicitly Out of Scope for MVP

State these clearly so no AI coding agent quietly builds them:

- **AI/ML-based matching** (the FAISS/scikit-learn/XGBoost pipeline described in the PairForge repo's `ai-services/matchmaking-service`). MVP scoring is a transparent weighted average, not a learned model.
- **Full microservices split / Kubernetes deployment.** MVP is one backend service against shared Postgres + Redis. Splitting into the repo's target microservices architecture is a later migration, not part of this build.
- **Admin UI screen** for managing criteria/weights. The database tables and protected API endpoints exist; a UI on top is a future add, not required for MVP.
- **Pair programming, hackathon/event board, GitHub integration** — all present in the broader PairForge vision, none are part of this feature.
- **Push notifications.** Connection requests and messages are visible in-app on load/poll; no APNs/FCM integration for MVP.
- **Payments/monetization** of any kind.

## 5. Success Metrics (directional, for MVP validation — not analytics infrastructure)

- A project can accumulate ratings from at least 3 different roles and produce a score that changes sensibly as new ratings come in.
- A user can go from superlike → owner acceptance → first message in under the time it takes to explain the flow out loud (i.e., the flow has no confusing dead ends).
- Criteria/weights can be changed by an admin without any code change or deploy.

## 6. Key Risks / Open Questions to Revisit After MVP

- Whether role weights (vc 1.5, founder/cofounder 1.2, developer 1.1, freelancer 1.0, student 0.8 — the seeded starting point) actually produce a score people trust, or need retuning/replacing with something more sophisticated.
- Whether 3 fixed criteria per role is enough, or some roles need more nuance once real usage starts.
- Whether the one-directional "swipe on a project" model needs a reciprocal signal from the owner's side before the request stage (currently: anyone can superlike, owner just accepts/declines after the fact).
