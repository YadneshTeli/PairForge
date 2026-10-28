# UI/UX Design Brief — PairForge Projects

Every screen below traces to a flow in `03-App-Flow.md` — nothing here introduces a screen the flow doc didn't require.

## 1. Screen Inventory

| Screen | Flow it belongs to | Core purpose |
|---|---|---|
| Role Selection | Onboarding | One-time pick from 6 roles |
| Feed (Swipe) | Swipe & Rate | Card-stack of projects, swipe gestures |
| Rating Overlay | Swipe & Rate | 3 sliders/inputs (1–5) shown only on like/superlike, scoped to viewer's role |
| Project Detail | Swipe & Rate, Post a Project | Full description, tags, stage, looking_for, owner info |
| Post a Project | Posting a Project | Form: title, tagline, description, stage, tags, looking_for |
| My Projects | Score viewing, Requests | List of projects the user owns, each showing live score + rating count |
| Requests Inbox | Owner Reviews Requests | Per-project list of pending requests, each showing requester's profile + their ratings |
| Matches / Chat List | Chat | List of accepted matches, unread indicator |
| Chat Thread | Chat | Message history + input, Socket.IO-backed |

That's 9 screens total for both web and mobile — no admin screen (per PRD, out of scope), no settings/profile-edit screen beyond what onboarding already needs.

## 2. Interaction Model

- **Feed:** swipe left = pass, swipe right = like (triggers rating overlay), swipe up (or a dedicated superlike button — swipe-up gestures are easy to trigger accidentally, so a distinct button is the safer default) = superlike (also triggers rating overlay, then creates a request).
- **Rating Overlay:** appears as a bottom sheet/modal immediately after a like/superlike swipe, blocking further swiping until the 3 required scores are submitted (no partial ratings — all 3 or the swipe doesn't commit).
- **Requests Inbox:** each request row has two clear actions — Accept / Decline — no ambiguity about what happens next (accept opens chat immediately, decline just dismisses).

## 3. Visual Tone

Not prescribing a specific visual system here (colors/typography are an implementation-time decision, not a planning-doc decision) — but three constraints worth stating for whoever builds the UI:

- **Role identity should be visually distinguishable at a glance** — e.g. a small role badge/icon on profile mentions (requester cards, project owner info) — because the same rating overlay looks different depending on whose criteria are showing, and users should never be confused about whose perspective a given rating represents.
- **The score should read as directional, not authoritative** — avoid presenting it like a stock ticker or precise percentage implying false precision (per PRD's "success metrics" section, this is a signal, not a verdict). A simple 1–5 or descriptive band ("Promising" / "Mixed signal" / "Needs work") is safer than "73.4%".
- **Superlike should feel weightier than like** — since it triggers an actual request to the owner, not just a rating. Differentiate visually (e.g. distinct color/icon) so it isn't swiped accidentally.

## 4. Empty States (explicitly required, easy to forget)

- Feed with no projects left to show for the day/session.
- My Projects with zero posted projects yet.
- Requests Inbox with zero pending requests.
- Matches list with zero accepted matches.
- Chat thread with zero messages yet (just opened after acceptance).

## 5. Platform Parity

Web (React) and mobile (Flutter) should share the same 9-screen structure and interaction model — no platform-specific screens for MVP. Visual polish/native idioms (e.g. iOS vs Android swipe affordances) can differ, but information architecture should not.
