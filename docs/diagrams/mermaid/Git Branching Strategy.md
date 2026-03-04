# Git Branching Strategy

```mermaid
gitGraph
   commit
   branch develop
   checkout develop
   commit
   commit

   branch feature-auth
   checkout feature-auth
   commit
   commit
   checkout develop
   merge feature-auth

   branch feature-matching
   checkout feature-matching
   commit
   commit
   checkout develop
   merge feature-matching

   checkout main
   merge develop
```
