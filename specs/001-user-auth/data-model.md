# Data Model Definition: User Authentication

**Related Feature**: 001-user-auth
**Date**: 2026-01-05

## Entities

### 1. User (New)
Top-level entity representing a user account.

| Field Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | Yes | Unique Identifier |
| `email` | `str` | Yes | Login ID (Unique) |
| `password_hash` | `str` | Yes | Password hashed with bcrypt |
| `created_at` | `datetime` | Yes | Signup Timestamp |
| `updated_at` | `datetime` | Yes | Update Timestamp |

### 2. Account (Modified)
Add owner (`user_id`) info to existing `Account` entity.

| Field Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `id` | `int` | Yes | Unique Identifier |
| `user_id` | `UUID` | Yes (FK) | **(New)** Owner User ID |
| `name` | `str` | Yes | Account Name (e.g., "My Pension") |
| `cash` | `float` | Yes | Deposit |
| `assets` | `List[Asset]` | No | List of held assets |

### 3. Asset (Existing)
Depends on `Account`, so no schema change needed.

## Validation Rules
1.  **Email**: Must be valid email format.
2.  **Password**: Minimum 8 characters (Adjust per policy).
3.  **Account Ownership**: All `Account`s must belong to a valid `User`.

## Database Schema (SQLModel)
    # ... Existing fields ...
