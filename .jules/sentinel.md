## 2025-05-15 - IDOR in Repository Layer
**Vulnerability:** The `AccountRepository.list_all()` method returned all accounts in the database regardless of ownership, and this was directly exposed via the `GET /accounts` endpoint.
**Learning:** The initial repository design focused on "listing entities" rather than "listing user entities", and the API layer failed to enforce the ownership constraint, assuming the repository would handle filtering or that the list operation was generic.
**Prevention:** Always implement `list_by_owner` or similar methods in repositories for user-owned resources. Ensure API endpoints explicitly pass the `current_user` ID to data access layers.

## 2026-02-20 - Missing Authorization on Mutation Endpoints (IDOR)
**Vulnerability:** Update and Delete endpoints (`PATCH /accounts/{id}`, `DELETE /assets/{id}`, etc.) lacked `current_user` dependency and ownership checks, allowing unauthorized users to modify or delete resources if they knew the ID.
**Learning:** Adding `list_by_user` for read operations (as noted in previous entry) is not enough. Mutation endpoints (Update/Delete) must also explicitly verify ownership (`resource.user_id == current_user.id`) *after* fetching the resource.
**Prevention:** Every endpoint that takes a resource ID as a path parameter must authenticate the user and authorize the action by checking ownership of the resource.
