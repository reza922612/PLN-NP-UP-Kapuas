# Security Specification: SIMAP PLN NP Kapuas

## Data Invariants
1. A user profile MUST have a valid role ('super_admin', 'admin', 'viewer').
2. Only 'super_admin' and 'admin' roles can perform write operations (create, update, delete) on employee data.
3. 'viewer' role is strictly read-only.
4. An employee record MUST belong to a valid unit and company.
5. All sensitive employee data (KTP, BPJS, etc.) is protected by role-based access.
6. Identity spoofing is prevented: users cannot change their own roles.
7. Terminal state locking: once an employee is marked as 'retired' or 'inactive' (if implemented), historical data remains immutable except by super_admin.

## The Dirty Dozen Payloads (Target: Denied)
1. **Identity Injection**: Attempt to create a user profile with role: 'super_admin' as a new user.
2. **Ghost Field Update**: Update employee data with `isVerified: true` (unsupported field).
3. **Privilege Escalation**: An 'admin' user attempting to change their own role to 'super_admin'.
4. **Unauthorized Deletion**: A 'viewer' attempting to delete an employee record.
5. **Orphaned Training**: Creating a training record for a non-existent employee ID.
6. **Value Poisoning**: Setting `nip.size() > 50` or `fullName` as a boolean.
7. **Bypass Verification**: Accessing PII data with an unverified email (if email verification is forced).
8. **Shadow Employee**: Creating an employee without a required `unitId`.
9. **Role Hopping**: Updating an employee record but attempting to change the immutable `nip`.
10. **Resource Exhaustion**: Sending a 1MB string as a `religion` field.
11. **Cross-Tenant Access**: (Simplified for this app) - Accessing data without any role assignment.
12. **System Field Tampering**: Overwriting `createdAt` timestamp with a past date.

## Test Runner (Conceptual)
Tests will verify that these payloads return `PERMISSION_DENIED`.
