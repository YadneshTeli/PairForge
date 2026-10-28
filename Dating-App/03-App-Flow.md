# App Flow Document — PairForge Projects

Every flow below ends in a defined terminal state — no path should leave the user stuck without a next action.

## 1. Onboarding / Role Selection

```mermaid
flowchart TD
A[Sign up / log in] --> B{Role already set?}
B -- Yes --> C[Go to Feed]
B -- No --> D[Select role: founder/cofounder/vc/developer/freelancer/student]
D --> C[Go to Feed]
```

Role is set once at signup (matches existing PairForge `profiles.role`). Changing role after signup is out of scope for MVP — if a user's role changes in real life, that's a support/admin action, not a self-serve settings screen.

## 2. Posting a Project

```mermaid
flowchart TD
A[Feed screen] --> B[Tap 'Post a Project']
B --> C[Fill: title, tagline, description, stage, tags, looking_for]
C --> D{Valid?}
D -- No --> C
D -- Yes --> E[Project created, owner = current user]
E --> F[Project appears in others' feeds]
E --> G[Owner sees it on their own 'My Projects' screen with live score]
```

## 3. Swipe & Rate

```mermaid
flowchart TD
A[Feed screen] --> B[View project card]
B --> C{Swipe action}
C -- Pass --> D[Insert swipe: action=pass, no ratings]
D --> A
C -- Like/Superlike --> E[Show rating form: 3 criteria for swiper's role, 1-5 each]
E --> F[Submit ratings]
F --> G[Insert swipe: action, ratings]
G --> H[Invalidate project score cache]
H --> I{Action was superlike?}
I -- No --> A
I -- Yes --> J[Insert match_request: status=pending]
J --> K[Owner notified — appears in their Requests inbox]
K --> A
```

Note: rating is required for like and superlike, not for pass — there's nothing meaningful to rate on a pass.

## 4. Owner Reviews Requests (mutual approval)

```mermaid
flowchart TD
A[Owner opens 'My Projects'] --> B[Selects a project]
B --> C[Views Requests tab: list of pending match_requests]
C --> D[Views requester's profile + their submitted ratings]
D --> E{Owner decision}
E -- Accept --> F[match_requests.status = accepted]
F --> G[Insert into matches]
G --> H[Chat thread now exists for both users]
E -- Decline --> I[match_requests.status = declined]
I --> J[Requester sees 'declined' state, no chat, no notification spam — just reflected next time they check]
```

This is the flow that implements mutual approval: a superlike alone never opens a chat. It only creates a request the owner must act on.

## 5. Chat

```mermaid
flowchart TD
A[Either user opens an accepted match] --> B[Client joins Socket.IO room match:id]
B --> C[Send message]
C --> D[Server persists message, broadcasts messageEvent to room]
D --> E[Other user's client receives event, renders message]
E --> F[Recipient marks read]
```

Matches existing PairForge `Socket.IO Event Flow` diagram exactly — no new pattern introduced.

## 6. Viewing Project Score (owner-facing)

```mermaid
flowchart TD
A[Owner views their project] --> B{Score cached in Redis?}
B -- Yes --> C[Return cached score]
B -- No --> D[Run weighted-average SQL aggregate]
D --> E[Cache result, 15 min TTL]
E --> C
C --> F[Display score + rating count to owner]
```

Score is owner-facing only for MVP — other users see a project card to swipe on, not its running score. (Flag if you actually want the score visible to everyone, e.g. as social proof — that's a one-line UI change, not a schema change, but worth deciding explicitly since it affects whether swiping is influenced by prior raters.)

## 7. Admin: Managing Rating Criteria / Weights

```mermaid
flowchart TD
A[Admin authenticated] --> B[GET /admin/rating-criteria or /admin/role-weights]
B --> C[View current criteria/weights]
C --> D[PATCH to edit label/active/sort_order, or weight value]
D --> E[Change takes effect on next swipe/score computation — no deploy needed]
```

No UI screen for this in MVP — an admin using the API directly (Postman, curl, or a future thin screen) is sufficient.
