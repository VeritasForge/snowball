## 2025-05-15 - IDOR in Repository Layer
**Vulnerability:** The `AccountRepository.list_all()` method returned all accounts in the database regardless of ownership, and this was directly exposed via the `GET /accounts` endpoint.
**Learning:** The initial repository design focused on "listing entities" rather than "listing user entities", and the API layer failed to enforce the ownership constraint, assuming the repository would handle filtering or that the list operation was generic.
**Prevention:** Always implement `list_by_owner` or similar methods in repositories for user-owned resources. Ensure API endpoints explicitly pass the `current_user` ID to data access layers.

## 2025-05-27 - Unauthenticated Mutation Endpoints (IDOR/Auth Bypass)
**Vulnerability:** Mutation endpoints (`update_account`, `delete_account`, `create_asset`, etc.) lacked `current_user` dependency and ownership checks. They blindly accepted IDs and performed operations, allowing both unauthenticated access and IDOR (manipulating others' resources).
**Learning:** Relying on a global or partial authentication scheme can leave specific routes exposed. FastAPI requires explicit `Depends(get_current_user)` on every secured endpoint unless a global middleware/dependency is configured on the router itself.
**Prevention:** Enforce authentication on all private routes. Explicitly verify ownership (`resource.user_id == current_user.id`) for every resource access, especially in `update` and `delete` operations.
