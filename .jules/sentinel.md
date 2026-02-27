## 2025-05-15 - IDOR in Repository Layer
**Vulnerability:** The `AccountRepository.list_all()` method returned all accounts in the database regardless of ownership, and this was directly exposed via the `GET /accounts` endpoint.
**Learning:** The initial repository design focused on "listing entities" rather than "listing user entities", and the API layer failed to enforce the ownership constraint, assuming the repository would handle filtering or that the list operation was generic.
**Prevention:** Always implement `list_by_owner` or similar methods in repositories for user-owned resources. Ensure API endpoints explicitly pass the `current_user` ID to data access layers.

## 2025-05-16 - IDOR in Account Mutation Endpoints
**Vulnerability:** The `PATCH /accounts/{id}` and `DELETE /accounts/{id}` endpoints did not verify that the authenticated user owned the account being modified or deleted. An attacker could modify or delete any user's account by guessing the account ID.
**Learning:** While `GET` endpoints were protected by `list_by_user` repository methods, mutation endpoints (`UPDATE`, `DELETE`) fetching by ID failed to perform a secondary check against `current_user.id`.
**Prevention:** In all mutation endpoints, after fetching a resource by ID, immediately assert `resource.user_id == current_user.id` before proceeding with any changes.
