# Security Testing Plan & Automated Verification Suite

## My Money — Personal Expense & Money Management Platform

This document describes the automated and manual security verification protocols implemented to validate the platform's defense-in-depth architecture.

---

## 1. Automated Security Testing Suite

The project includes an automated security regression test runner located in [scripts/run-security-tests.ts](file:///C:/Users/hp/Downloads/my%20money/scripts/run-security-tests.ts).

### Running the Suite

Execute the following command in the project root:

```bash
npm run test:security
```

### Test Case Coverage Matrix

| Test ID | Test Category | Target Assertion | Pass Criteria |
|---|---|---|---|
| **Test 01** | **Multi-Tenancy** | User A cannot query or view User B transactions | Queries under User A return strictly User A transactions; zero records of User B leak. |
| **Test 02** | **Access Control** | User A cannot edit User B transactions (Anti-IDOR) | `assertResourceOwnership` throws `SecurityAuthorizationError`; audit logs `IDOR_TAMPER_ATTEMPT`. |
| **Test 03** | **Access Control** | User A cannot delete User B transactions | Deletion attempt throws `SecurityAuthorizationError` and blocks record deletion. |
| **Test 04** | **Privilege Separation**| Ordinary user cannot access admin routes or methods | Calling admin functions with role `user` throws `SecurityAuthorizationError`; audit logs `ACCESS_DENIED`. |
| **Test 05** | **Privilege Separation**| User cannot self-elevate role to `admin` | Tampered transaction payload with spoofed `user_id` or role is rejected by `validateTransactionPayload`. |
| **Test 06** | **Data Privacy** | Admin user list and audit logs never expose passwords | Admin list object keys contain only `id`, `email`, `createdAt`, `status`. Passwords/hashes/tokens are strictly absent. |
| **Test 07** | **Authentication** | Password policy enforces 8+ characters and complexity | Passwords under 8 characters, missing uppercase, digits, or symbols are rejected with descriptive errors. |
| **Test 08** | **Input Validation** | Stored and reflected XSS payloads are neutralized | `<script>`, `<iframe>`, and `onerror=` event handlers are stripped; special HTML entities (`&`, `<`, `>`, `"`) are encoded. |
| **Test 09** | **Data Integrity** | Negative amounts, NaN, and numeric overflow are rejected | Negative numbers, zero, strings, and values > ₹10 Crore are rejected by `validateAmount`. |
| **Test 10** | **Rate Limiting** | 5 consecutive failed logins trigger lockout restriction | After 5 failed attempts, `rateLimiter.check()` returns `allowed: false` with positive lockout countdown. |

---

## 2. Latest Automated Test Execution Output

```
================================================================
🔒 ENTERPRISE SECURITY AUTOMATED VERIFICATION SUITE
Project: Personal Expense & Money Management (My Money)
Timestamp: 2026-11-02T16:55:34.139Z
================================================================

RESULTS:
----------------------------------------------------------------
✅ [Test 01] [Multi-Tenancy] User A cannot view User B transactions
✅ [Test 02] [Access Control] User A cannot edit User B transactions (Anti-IDOR)
✅ [Test 03] [Access Control] User A cannot delete User B transactions
✅ [Test 04] [Privilege Separation] Ordinary user cannot access admin routes or methods
✅ [Test 05] [Privilege Separation] User cannot self-elevate role to "admin"
✅ [Test 06] [Data Privacy] Admin user list and audit logs never expose passwords or hashes
✅ [Test 07] [Authentication] Weak or short passwords rejected by policy
✅ [Test 08] [Input Validation] Stored & Reflected XSS scripts are sanitized
✅ [Test 09] [Data Integrity] Negative amounts, NaN, and numeric overflow are rejected
✅ [Test 10] [Rate Limiting] 5 consecutive failed logins trigger lockout restriction
----------------------------------------------------------------
Total: 10 | Passed: 10 | Failed: 0

🎉 ALL 10 ENTERPRISE SECURITY TESTS PASSED SUCCESSFULLY!
```

---

## 3. Manual Security Verification Procedures

In addition to automated tests, QA and security auditors can verify defenses manually:

### Scenario 1: Password Strength Real-Time Feedback
1. Open the application at `http://localhost:5173/`.
2. Click **Sign Up (Register)**.
3. In the Password field, type `test123`.
4. **Verification**: Observe that the strength indicator shows **Weak (Red)** and checklist flags missing 12+ characters, uppercase letter, and special symbol. The submit button displays clear policy validation errors.
5. Type `Security@Master2026!`.
6. **Verification**: Observe all four criteria light up green and the score shows **Very Strong**.

### Scenario 2: Brute-Force Lockout Testing
1. On the Login tab, enter a valid email address (e.g. `user@example.com`).
2. Type an incorrect password and click **Log In** 5 consecutive times.
3. **Verification**: On the 5th attempt, observe the alert:
   `"Too many failed login attempts. For your security, this account has been temporarily restricted for 5 minutes."`
4. Further login attempts are blocked immediately without querying the backend until the cooldown expires.

### Scenario 3: Admin Dashboard Access Control & Privacy Audit
1. Log in using the designated Admin credentials:
   - Email: `admin@mymoney.com`
   - Password: `Admin@Sec2026!Master`
2. Open the **Admin Security** dashboard from the sidebar.
3. **Verification of Mandated Fields**:
   - Check the user table. Verify that it contains **ONLY**:
     1. User ID (UUID)
     2. User Login Email
     3. Account Creation Date
     4. Account Status (`Active` / `Suspended`)
   - Confirm that NO user passwords, NO password hashes, NO credit/debit balances, and NO individual transaction records are displayed anywhere in the admin interface.
4. Click **Security Audit Trail** in the Admin Dashboard:
   - Verify that recent security events (`ADMIN_LOGIN`, `LOGIN_SUCCESS`, `LOGIN_FAILURE`) appear with timestamps, and all sensitive fields (`password`, `token`) are sanitized as `[REDACTED_SECURITY_DATA]`.
5. Click **Suspend** on any test user account:
   - Confirm suspension modal.
   - Log out and attempt to log in as the suspended user.
   - **Verification**: Login is blocked with message: `"Access Denied: This account is currently suspended. Contact support."`

### Scenario 4: Local Storage Credential Exposure Audit
1. Open Browser Developer Tools (`F12`) -> **Application** -> **Local Storage**.
2. Inspect `my_money_auth_session` and `my_money_sec_user_dir`.
3. **Verification**:
   - Confirm that no plaintext passwords exist anywhere in storage.
   - Stored credentials only contain salted cryptographic hashes (`passwordHash`) and random UUIDs.

---

## 4. Continuous Security Maintenance Checklist

- [x] Run `npm run test:security` before each commit or deployment.
- [x] Ensure PostgreSQL RLS policies in [RLS_POLICIES.sql](file:///C:/Users/hp/Downloads/my%20money/RLS_POLICIES.sql) are deployed to the production Supabase database.
- [x] Rotate Supabase service role keys and never expose them in client environment variables.
- [x] Keep CSP headers and HTTP security headers active in [vite.config.ts](file:///C:/Users/hp/Downloads/my%20money/vite.config.ts).
