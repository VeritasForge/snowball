## 2025-05-15 - IDOR in Repository Layer
**Vulnerability:** The `AccountRepository.list_all()` method returned all accounts in the database regardless of ownership, and this was directly exposed via the `GET /accounts` endpoint.
**Learning:** The initial repository design focused on "listing entities" rather than "listing user entities", and the API layer failed to enforce the ownership constraint, assuming the repository would handle filtering or that the list operation was generic.
**Prevention:** Always implement `list_by_owner` or similar methods in repositories for user-owned resources. Ensure API endpoints explicitly pass the `current_user` ID to data access layers.

## 2024-05-23 - IDOR in Account Management
**Vulnerability:** The `update_account` and `delete_account` endpoints in `routes.py` accepted an `account_id` and performed operations without verifying if the account belonged to the `current_user`.
**Learning:** Implicit trust in ID parameters without ownership checks is a recurring pattern. The lack of `current_user` dependency in these specific routes made them effectively unauthenticated for authorization purposes, even if the router had a default auth scheme (which it didn't strictly enforce on these endpoints).
**Prevention:** All mutation endpoints (PATCH, DELETE, PUT) must inject `current_user` and explicitly verify `resource.user_id == current_user.id` immediately after fetching the resource.
