## 2025-05-15 - IDOR in Repository Layer
**Vulnerability:** The `AccountRepository.list_all()` method returned all accounts in the database regardless of ownership, and this was directly exposed via the `GET /accounts` endpoint.
**Learning:** The initial repository design focused on "listing entities" rather than "listing user entities", and the API layer failed to enforce the ownership constraint, assuming the repository would handle filtering or that the list operation was generic.
**Prevention:** Always implement `list_by_owner` or similar methods in repositories for user-owned resources. Ensure API endpoints explicitly pass the `current_user` ID to data access layers.

## 2025-05-30 - IDOR in Account Mutation Endpoints
**Vulnerability:** The `update_account` and `delete_account` endpoints in `routes.py` fetched accounts by ID but failed to verify if the account belonged to the authenticated user. This allowed any user to modify or delete any account by guessing the ID.
**Learning:** Checking ownership only during "listing" (GET /accounts) is insufficient. Every endpoint that accesses a specific resource by ID must independently verify ownership against `current_user`.
**Prevention:** Always include `current_user: Annotated[User, Depends(get_current_user)]` in mutation endpoints and explicitly check `if resource.user_id != current_user.id: raise Forbidden`.
