## 2025-05-15 - IDOR in Repository Layer
**Vulnerability:** The `AccountRepository.list_all()` method returned all accounts in the database regardless of ownership, and this was directly exposed via the `GET /accounts` endpoint.
**Learning:** The initial repository design focused on "listing entities" rather than "listing user entities", and the API layer failed to enforce the ownership constraint, assuming the repository would handle filtering or that the list operation was generic.
**Prevention:** Always implement `list_by_owner` or similar methods in repositories for user-owned resources. Ensure API endpoints explicitly pass the `current_user` ID to data access layers.

## 2025-05-15 - IDOR in Mutation Endpoints
**Vulnerability:** The `update_account` and `delete_account` endpoints in `routes.py` only fetched the resource by ID without checking if it belonged to the authenticated user.
**Learning:** Checking for resource existence (`if not existing: 404`) is not enough for security. Explicit ownership checks (`if existing.user_id != current_user.id: 403`) are mandatory for all mutation endpoints acting on user-owned resources.
**Prevention:** Always inject `current_user` in mutation endpoints and validate `resource.user_id == current_user.id` immediately after fetching the resource.
