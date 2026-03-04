# Notification System Flow

```mermaid
flowchart TD

A[System Event] --> B{Event Type}

B --> C[New Match]
B --> D[New Message]
B --> E[Project Invite]
B --> F[Event Reminder]

C --> G[Push Notification]
D --> G
E --> G
F --> G

G --> H[User Device]
```
