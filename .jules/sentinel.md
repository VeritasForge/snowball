## 2025-05-15 - IDOR in Repository Layer
**Vulnerability:** The `AccountRepository.list_all()` method returned all accounts in the database regardless of ownership, and this was directly exposed via the `GET /accounts` endpoint.
**Learning:** The initial repository design focused on "listing entities" rather than "listing user entities", and the API layer failed to enforce the ownership constraint, assuming the repository would handle filtering or that the list operation was generic.
**Prevention:** Always implement `list_by_owner` or similar methods in repositories for user-owned resources. Ensure API endpoints explicitly pass the `current_user` ID to data access layers.

## 2026-03-13 - [Insecure Direct Object Reference (IDOR) on Mutation Endpoints]
**Vulnerability:** Mutation endpoints (`update_account`, `delete_account`, `create_asset`, `update_asset`, `delete_asset`) did not verify if the target resource (account or asset) belonged to the authenticated user. An attacker could modify or delete other users' assets or accounts by guessing or enumerating IDs.
**Learning:** Even if `current_user` is required by the API, retrieving an object by ID from the database and saving/deleting it without verifying `object.user_id == current_user.id` constitutes a critical IDOR vulnerability. Creating a child resource (asset) under a parent resource (account) also requires checking if the parent resource belongs to the current user.
**Prevention:** For direct resources (e.g., account), always check `resource.user_id == current_user.id`. For child resources (e.g., asset), always verify the parent's ownership `parent.user_id == current_user.id`. Both must be checked before action, throwing `HTTPException(HTTPStatus.FORBIDDEN)` on authorization failure.
