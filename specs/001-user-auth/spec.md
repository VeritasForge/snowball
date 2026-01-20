# Requirement Specification: User Authentication

**Related Feature**: 001-user-auth
**Date**: 2026-01-05

## Requirements *(Mandatory)*

### Functional Requirements
- **FR-001**: The system must support Email/Password based Signup and Login.
- **FR-002**: **(Critical)** Portfolio state of non-logged-in users must be automatically saved in browser Local Storage.
- **FR-003**: Upon login, the system must immediately retrieve user's portfolio data from the server.
- **FR-004**: **(Data Integrity)** In logged-in state, all changes must be saved to server DB first and then reflected on screen upon success. Local Storage should be used only for caching or synced with server data.
- **FR-005**: On logout, data remaining in the current browser's Local Storage (previous user's) must be deleted or access-blocked for security.
- **FR-006**: Display appropriate UI (Button/Profile) in frontend top-right corner based on login status.

### Key Entities
- **User**: User account info.
- **Portfolio**: Linked with User ID. (For Guest, managed via Local Storage key without `userId`)

## Success Criteria *(Mandatory)*

### Measurable Outcomes
- **SC-001**: 100% success rate of data recovery when Guest user refreshes the page.
- **SC-002**: Server data loading and screen update upon login must complete within 300ms, with smooth transition from local data.
- **SC-003**: When logged-in user logs in from a different device, data saved from previous device must appear immediately.

### Edge Cases
- **Local Storage Quota Exceeded**: If local save fails due to browser limit -> Notify user that data might not be saved and recommend login. However, allow continued use in volatile mode if user chooses not to login.
