## 2025-05-15 - IDOR in Repository Layer
**Vulnerability:** The `AccountRepository.list_all()` method returned all accounts in the database regardless of ownership, and this was directly exposed via the `GET /accounts` endpoint.
**Learning:** The initial repository design focused on "listing entities" rather than "listing user entities", and the API layer failed to enforce the ownership constraint, assuming the repository would handle filtering or that the list operation was generic.
**Prevention:** Always implement `list_by_owner` or similar methods in repositories for user-owned resources. Ensure API endpoints explicitly pass the `current_user` ID to data access layers.

## 2025-02-23 - Prevent IDOR by Verifying Ownership on Relationship Endpoints
**Vulnerability:** IDOR (Insecure Direct Object Reference) vulnerabilities were present on modification endpoints (update, delete) for accounts and assets, and creation endpoints for assets, allowing users to modify or add resources belonging to other users.
**Learning:** Checking for authentication (`get_current_user`) isn't enough; authorization must be verified explicitly by checking that the entity being modified (e.g. `Account.user_id`) or the entity an item is being added to (e.g. `Asset.account_id` -> `Account.user_id`) matches the `current_user.id`.
**Prevention:** For any endpoint that accesses or modifies a resource by ID, always fetch the resource (and its parent if applicable) and assert that it is owned by the currently authenticated user before performing the action.
