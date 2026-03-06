## 2025-05-15 - IDOR in Repository Layer
**Vulnerability:** The `AccountRepository.list_all()` method returned all accounts in the database regardless of ownership, and this was directly exposed via the `GET /accounts` endpoint.
**Learning:** The initial repository design focused on "listing entities" rather than "listing user entities", and the API layer failed to enforce the ownership constraint, assuming the repository would handle filtering or that the list operation was generic.
**Prevention:** Always implement `list_by_owner` or similar methods in repositories for user-owned resources. Ensure API endpoints explicitly pass the `current_user` ID to data access layers.
## 2025-05-15 - IDOR in Mutation Endpoints
**Vulnerability:** The API mutation endpoints (e.g., `PATCH /accounts/{id}`, `DELETE /accounts/{id}`, `POST /assets`, `PATCH /assets/{id}`, `DELETE /assets/{id}`, `POST /assets/execute`) lacked authorization checks. A user could modify or delete resources belonging to other users by simply knowing the resource ID.
**Learning:** We must not only rely on filtering when retrieving lists (`list_by_user`), but we must explicitly verify ownership in all mutation endpoints by asserting that the retrieved resource's `user_id` matches the `current_user.id`. For child resources like assets, we must traverse up to the parent account to verify ownership.
**Prevention:** Always inject `current_user` into mutation endpoints and explicitly assert ownership before taking action. Reject requests with HTTP 403 Forbidden if ownership validation fails.
