# Plan: User Authentication & Multi-Account Support

This feature implements user authentication (Signup, Login) and Guest Mode to lay the foundation for multi-account support.

## Core Requirements
1.  **Guest Mode**: Usable without login, data preserved in browser Local Storage.
2.  **Authentication System**: Email/Password authentication based on JWT (Planned).
3.  **Data Sync**: Prioritize server data on login, establish strategy for local data handling.
4.  **Security**: Password hashing and secure session management.

**Constraints**: Adhere to Clean Architecture, TDD Mandatory.

**Structure Decision**: Adhere to Clean Architecture, separating Backend into Domain/Use Cases/Adapters. Frontend follows Next.js App Router structure.
