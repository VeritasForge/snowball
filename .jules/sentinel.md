## 2025-05-15 - IDOR in Repository Layer
**Vulnerability:** The `AccountRepository.list_all()` method returned all accounts in the database regardless of ownership, and this was directly exposed via the `GET /accounts` endpoint.
**Learning:** The initial repository design focused on "listing entities" rather than "listing user entities", and the API layer failed to enforce the ownership constraint, assuming the repository would handle filtering or that the list operation was generic.
**Prevention:** Always implement `list_by_owner` or similar methods in repositories for user-owned resources. Ensure API endpoints explicitly pass the `current_user` ID to data access layers.

## 2024-04-03 - [Missing Resource Ownership Checks in Mutation Endpoints (IDOR)]
**Vulnerability:** Insecure Direct Object Reference (IDOR) vulnerabilities existed in multiple mutation API endpoints (`update_account`, `delete_account`, `create_asset`, `update_asset`, `delete_asset`, `execute_trade`). These endpoints lacked authorization checks to verify if the authenticated `current_user` owned the target resource, allowing any authenticated user to modify or delete other users' accounts and assets by simply knowing or guessing the resource ID.
**Learning:** While the read queries (`list_accounts`) correctly filtered data by `current_user.id`, the mutation routes neglected this critical authorization step after fetching the resource from the repository. This highlights a common pattern where authentication is enforced globally (or route-level), but object-level authorization is easily overlooked during the implementation of CRUD operations.
**Prevention:** Always inject `current_user` into endpoints that mutate or access specific resources by ID. After fetching a resource (e.g., `existing = repo.get(id)`), explicitly check `existing.user_id == current_user.id` (or the equivalent parent association, like `account.user_id`) before allowing the operation to proceed, raising `HTTPStatus.FORBIDDEN` if the check fails. Writing explicit test cases that simulate an "attacker" user attempting to modify another "owner" user's resources is essential for verifying these protections.

## 2025-02-27 - [CRITICAL] Remove Hardcoded Default Admin Password
**Vulnerability:** A hardcoded plaintext password (`"admin1234"`) was present in `backend/src/snowball/infrastructure/main.py` when seeding the default admin user.
**Learning:** Hardcoded credentials in source code (especially for admin accounts) present a massive security risk, as anyone with access to the source code or binary could authenticate as an administrator. It is crucial to always use environment variables for sensitive default configuration, and if none are provided, a securely generated random string should be used instead of a guessable fallback.
**Prevention:**
- Use environment variables to seed default credentials (e.g., `os.getenv("ADMIN_DEFAULT_PASSWORD")`).
- Employ `secrets.token_urlsafe(16)` as a secure fallback to ensure no predictable default passwords exist.
- Avoid committing any form of plaintext passwords directly to source control.
