# Enterprise Security Policy & Architecture Guide

## My Money — Personal Expense & Money Management Platform

> **Important Security Disclaimer**: No digital system is 100% impenetrable. This application implements a defense-in-depth security architecture grounded in industry standards (OWASP Top 10, NIST SP 800-63B, Principle of Least Privilege) to mitigate risk, protect sensitive financial records, prevent unauthorized access, and ensure strict tenant isolation. Continuous testing and auditing must remain part of the system's operational lifecycle.

---

## 1. Security Architecture Overview

The system is constructed with a multi-layered security model where each layer enforces security controls independently:

```
[ Client Browser (React + CSP) ]
           │
           ▼
[ Layer 1: Frontend Hardening ] ── Strict Content-Security-Policy, Anti-Clickjacking, Anti-MIME sniffing
           │
           ▼
[ Layer 2: API & Validation ]   ── XSS HTML entity encoding, amount boundaries (>0, <=10Cr), mass assignment stripping
           │
           ▼
[ Layer 3: Auth & Rate Limiting ]── Supabase Auth / Scrypt / PBKDF2, 12+ char password policy, 5-attempt brute-force lockout
           │
           ▼
[ Layer 4: Database RLS ]        ── PostgreSQL Row Level Security (auth.uid() = user_id), Anti-IDOR ownership triggers
           │
           ▼
[ Layer 5: Audit Trail ]        ── Append-only immutable security audit log (zero passwords/tokens recorded)
```

---

## 2. Authentication Security

### 2.1 Password Policy
- **Minimum Length**: 8 characters (12+ recommended).
- **Complexity Requirements**:
  - At least one uppercase Latin character (`A-Z`).
  - At least one lowercase Latin character (`a-z`).
  - At least one numeric digit (`0-9`).
  - At least one special symbol (`!@#$%^&*()_+-=[]{}|;:,.<>?`).
- **Common Weak Password Rejection**: Real-time rejection of common dictionary passwords (e.g. `password12345`, `123456789012`).
- **Zero Plaintext Storage**: Passwords are never stored in plaintext in local storage, memory heaps, browser caches, or application databases. Password hashing is delegated to Supabase Auth / Scrypt or cryptographic salted SHA-256 in offline environments.

### 2.2 Brute-Force & Credential Stuffing Defenses
- **Rate Limiting Engine**: Tracks consecutive failed login attempts by account identifier.
- **Progressive Restriction**:
  - Maximum 5 failed attempts within a 15-minute window.
  - On the 5th failed attempt, the account is temporarily restricted with a 5-minute cooldown (`LOCKOUT_DURATION_MS = 300,000 ms`).
  - Security event `LOGIN_LOCKED_OUT` is logged to the audit log.
- **Account Recovery**: Secure password reset via verified email link (`requestPasswordReset()`), preventing user enumeration by returning neutral verification messages.

---

## 3. Strict Multi-Tenancy & Data Isolation

### 3.1 Financial Data Isolation
- Every transaction record is permanently and immutably bound to the creator's authenticated user ID (`user_id`).
- In the client application and in PostgreSQL Row Level Security (RLS), queries for transactions strictly enforce:
  ```sql
  auth.uid() = user_id
  ```
- **Zero Cross-User Visibility**: User A cannot read, query, aggregate, or infer User B's financial balances or transaction history.

### 3.2 Anti-IDOR (Insecure Direct Object Reference) Protection
- Mutating or deleting a transaction requires cryptographic ownership verification:
  ```typescript
  assertResourceOwnership(currentUserId, targetRecord.user_id);
  ```
- Any attempt by User A to edit or delete User B's transaction throws a `SecurityAuthorizationError`, immediately halts execution, and records an `IDOR_TAMPER_ATTEMPT` event in the security audit trail.
- Database trigger `prevent_transaction_owner_change()` raises a PostgreSQL exception if any UPDATE attempts to reassign `user_id`.

---

## 4. Admin Dashboard Security

### 4.1 Strict Admin View Scope
To eliminate insider threat, privacy violations, and data exfiltration risks, the Admin Dashboard is constrained to display **ONLY** the four required account administration fields:
1. **User ID** (`UUID` / unique identifier)
2. **User Login Email / Login ID**
3. **Account Creation Date**
4. **Account Status** (`active` | `suspended`)

### 4.2 Prohibited Information in Admin View
The Admin Dashboard **NEVER** displays:
- User passwords or password hashes.
- User financial records (income, expenses, room rent, groceries, loans).
- Private personal notes or phone numbers.
- Authentication tokens, session cookies, or secret keys.

### 4.3 Administrative Authorization
- Ordinary users accessing `/admin` routes receive a `403 Forbidden` response and an `ACCESS_DENIED` audit entry.
- Admin status is verified server-side via `profiles` table with `role = 'admin'`. Frontend role tampering is ineffective because PostgreSQL RLS verifies `public.is_admin()`.
- Administrators can suspend/activate accounts and dispatch password reset links, but cannot alter other users' balances.

---

## 5. Database Security (Supabase PostgreSQL RLS)

All security policies are codified in [RLS_POLICIES.sql](file:///C:/Users/hp/Downloads/my%20money/RLS_POLICIES.sql).

| Table | Operation | Policy Rule | Enforced By |
|---|---|---|---|
| `profiles` | SELECT | `auth.uid() = id OR public.is_admin()` | PostgreSQL RLS |
| `profiles` | INSERT | `auth.uid() = id AND role = 'user'` | Anti-Escalation Check |
| `profiles` | UPDATE | `public.is_admin()` for role/status changes | PostgreSQL RLS |
| `transactions` | SELECT | `auth.uid() = user_id` | Strict Tenant Isolation |
| `transactions` | INSERT | `auth.uid() = user_id` | With Check constraint |
| `transactions` | UPDATE | `auth.uid() = user_id` | RLS + Ownership Trigger |
| `transactions` | DELETE | `auth.uid() = user_id` | PostgreSQL RLS |
| `security_audit_logs` | INSERT | `auth.role() IN ('authenticated', 'anon')` | Audit Logger |
| `security_audit_logs` | SELECT | `public.is_admin()` | Admin Only |
| `security_audit_logs` | UPDATE / DELETE | `DENIED FOR ALL` | Immutability Trigger |

---

## 6. Protection Against Common Cyberattacks

| Threat | Risk Level | Defense Mechanism Implemented |
|---|---|---|
| **Cross-Site Scripting (XSS)** | High | HTML entity escaping (`escapeHtml`), regex stripping of script/iframe/object tags, removal of inline event handlers (`onerror=`, `onclick=`), and strict Content Security Policy. |
| **SQL Injection (SQLi)** | Critical | Parameterized queries via Supabase client, input validation, and typed ORM layers. No raw string interpolation into SQL. |
| **Cross-Site Request Forgery (CSRF)** | Medium | Bearer token authorization headers, SameSite cookie enforcement, and origin checking. |
| **Insecure Direct Object Reference (IDOR)** | Critical | Ownership assertion (`assertResourceOwnership`) on all mutations; PostgreSQL `prevent_transaction_owner_change()` trigger. |
| **Privilege Escalation** | Critical | Role assignment is constrained to server-side profile creation. Self-updating role to 'admin' is rejected by RLS `WITH CHECK`. |
| **Clickjacking** | Medium | `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`. |
| **MIME Sniffing** | Low | `X-Content-Type-Options: nosniff`. |
| **Credential Stuffing / Brute Force** | High | Client and session rate limiter locking accounts for 5 minutes after 5 consecutive failures. |
| **Mass Assignment** | Medium | Explicit payload destructuring and whitelisting in `validateTransactionPayload()`. Unrecognized fields are discarded. |
| **Financial Value Tampering** | High | `validateAmount()` enforces `num > 0`, `num <= 100,000,000`, NaN rejection, and 2-decimal rounding. |

---

## 7. HTTP Security Headers

The following headers are configured in [vite.config.ts](file:///C:/Users/hp/Downloads/my%20money/vite.config.ts) for both dev and production preview servers:

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.firebaseio.com wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firestore.googleapis.com; img-src 'self' data: https:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## 8. Security Audit Logging

The platform maintains an immutable audit trail (`securityAudit`) tracking security-critical events:
- `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `LOGIN_LOCKED_OUT`
- `PASSWORD_RESET_REQUESTED`
- `ADMIN_LOGIN`
- `USER_SUSPENDED`, `USER_ACTIVATED`
- `ACCESS_DENIED`
- `IDOR_TAMPER_ATTEMPT`
- `VALIDATION_FAILURE`

**Audit Log Sanitization Rule**: Details attached to audit logs are strictly filtered through `sanitizeDetails()` which automatically redacts any fields containing `password`, `token`, `secret`, `apikey`, or `auth` before persisting.

---

## 9. Vulnerability Disclosure & Incident Response

1. **Reporting**: Send security disclosures to `security@mymoney.com` with reproducible steps and proof-of-concept.
2. **Triage SLA**: Critical security reports are acknowledged within 24 hours.
3. **Remediation**: Patches are tested against the automated testing suite (`npm run test:security`) prior to deployment.
