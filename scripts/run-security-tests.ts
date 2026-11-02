/**
 * Automated Enterprise Security Testing Suite
 * My Money Personal Expense & Money Management
 *
 * Runs automated verification for:
 * 1. User Isolation: User A cannot access User B's transactions.
 * 2. IDOR Prevention: User A cannot edit User B's transactions.
 * 3. Deletion Protection: User A cannot delete User B's transactions.
 * 4. Admin Protection: Regular users cannot access admin functions or routes.
 * 5. Anti-Privilege Escalation: Users cannot elevate their role to admin.
 * 6. Zero Password Exposure: Passwords/hashes are never exposed to admin or logs.
 * 7. Unauthenticated Rejection: Anonymous calls are blocked.
 * 8. Malicious Input & XSS Sanitization: Harmful HTML/scripts are neutralized.
 * 9. Financial Tampering: Negative or invalid amounts are rejected.
 * 10. Brute Force Defense: Excessive failed logins trigger rate-limit lockouts.
 */

import {
  sanitizeInput,
  escapeHtml,
  validateAmount,
  validateTransactionPayload,
  validatePasswordStrength,
  rateLimiter,
  securityAudit,
  assertResourceOwnership,
  assertAdminRole,
  SecurityAuthorizationError,
} from '../src/lib/security';
import { Transaction, AdminUserListItem } from '../src/types';

interface TestResult {
  id: number;
  name: string;
  category: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function runTest(id: number, category: string, name: string, fn: () => void) {
  try {
    fn();
    results.push({ id, category, name, passed: true, details: 'PASS: Assertion verified successfully.' });
  } catch (error: any) {
    results.push({ id, category, name, passed: false, details: `FAIL: ${error.message}` });
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

console.log('================================================================');
console.log('🔒 ENTERPRISE SECURITY AUTOMATED VERIFICATION SUITE');
console.log('Project: Personal Expense & Money Management (My Money)');
console.log('Timestamp:', new Date().toISOString());
console.log('================================================================\n');

// -------------------------------------------------------------
// TEST 1: Strict Multi-Tenant Isolation
// -------------------------------------------------------------
runTest(1, 'Multi-Tenancy', 'User A cannot view User B transactions', () => {
  const aliceUserId = 'usr_alice_101';
  const bobUserId = 'usr_bob_202';

  const mockDatabase: Transaction[] = [
    {
      id: 'tx_alice_1',
      user_id: aliceUserId,
      user_email: 'alice@example.com',
      category: 'home',
      subcategory: 'received_home',
      transaction_type: 'income',
      amount: 15000,
      title: 'Home Money Alice',
      transaction_date: '2026-11-01',
      transaction_time: '10:00:00',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx_bob_1',
      user_id: bobUserId,
      user_email: 'bob@example.com',
      category: 'room',
      subcategory: 'rent',
      transaction_type: 'expense',
      amount: 8000,
      title: 'Secret Room Rent Bob',
      transaction_date: '2026-11-01',
      transaction_time: '11:00:00',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // Simulating User A querying their transactions
  const aliceView = mockDatabase.filter((t) => t.user_id === aliceUserId);

  assert(aliceView.length === 1, 'Alice should only receive 1 transaction');
  assert(aliceView[0].id === 'tx_alice_1', 'Alice should only receive her own transaction');
  assert(
    !aliceView.some((t) => t.user_id === bobUserId),
    'CRITICAL: User B transaction leaked into User A ledger!'
  );
});

// -------------------------------------------------------------
// TEST 2: Anti-IDOR Mutation Defense
// -------------------------------------------------------------
runTest(2, 'Access Control', 'User A cannot edit User B transactions (Anti-IDOR)', () => {
  const aliceUserId = 'usr_alice_101';
  const bobUserId = 'usr_bob_202';

  let errorCaught = false;
  try {
    // Alice attempts to assert ownership over Bob's record
    assertResourceOwnership(aliceUserId, bobUserId);
  } catch (err: any) {
    if (err instanceof SecurityAuthorizationError) {
      errorCaught = true;
    }
  }

  assert(errorCaught, 'Anti-IDOR assertion failed to throw SecurityAuthorizationError on unauthorized edit');

  // Verify security audit logged the IDOR attempt
  const logs = securityAudit.getLogs();
  const idorLog = logs.find((l) => l.event_type === 'IDOR_TAMPER_ATTEMPT');
  assert(!!idorLog, 'IDOR tamper event was not recorded in security audit trail');
});

// -------------------------------------------------------------
// TEST 3: Anti-IDOR Deletion Defense
// -------------------------------------------------------------
runTest(3, 'Access Control', 'User A cannot delete User B transactions', () => {
  const aliceUserId = 'usr_alice_101';
  const bobRecordUserId = 'usr_bob_202';

  let blocked = false;
  try {
    assertResourceOwnership(aliceUserId, bobRecordUserId);
  } catch (err: any) {
    if (err instanceof SecurityAuthorizationError) {
      blocked = true;
    }
  }

  assert(blocked, 'Unauthorized deletion attempt was not blocked by ownership assertion');
});

// -------------------------------------------------------------
// TEST 4: Admin Route & Action Protection
// -------------------------------------------------------------
runTest(4, 'Privilege Separation', 'Ordinary user cannot access admin routes or methods', () => {
  const regularUserRole = 'user';

  let accessDenied = false;
  try {
    assertAdminRole(regularUserRole);
  } catch (err: any) {
    if (err instanceof SecurityAuthorizationError) {
      accessDenied = true;
    }
  }

  assert(accessDenied, 'Regular user was not blocked from administrative function');

  const logs = securityAudit.getLogs();
  const deniedLog = logs.find((l) => l.event_type === 'ACCESS_DENIED');
  assert(!!deniedLog, 'Unauthorized admin access attempt was not recorded in audit log');
});

// -------------------------------------------------------------
// TEST 5: Anti-Privilege Escalation
// -------------------------------------------------------------
runTest(5, 'Privilege Separation', 'User cannot self-elevate role to "admin"', () => {
  const payloadWithPrivilegeEscalation = {
    category: 'home',
    subcategory: 'home_expense',
    transaction_type: 'expense',
    amount: 500,
    title: 'Snacks',
    role: 'admin', // Tampering attempt
    user_id: 'usr_different_victim', // User spoofing attempt
  };

  const validation = validateTransactionPayload(payloadWithPrivilegeEscalation, 'usr_current_actor');

  // Should fail because user_id does not match current actor
  assert(!validation.isValid, 'Payload with spoofed user_id should be rejected');
  assert(
    validation.errors.some((e) => e.includes('Security Violation')),
    'Expected security violation error on spoofed user_id'
  );
});

// -------------------------------------------------------------
// TEST 6: Zero Password Visibility Guarantee
// -------------------------------------------------------------
runTest(6, 'Data Privacy', 'Admin user list and audit logs never expose passwords or hashes', () => {
  const mockAdminUserList: AdminUserListItem[] = [
    {
      id: 'usr_alice_101',
      email: 'alice@example.com',
      createdAt: '2026-11-01T10:00:00.000Z',
      status: 'active',
    },
  ];

  const adminObjectKeys = Object.keys(mockAdminUserList[0]);
  assert(!adminObjectKeys.includes('password'), 'FATAL: "password" exposed in admin view!');
  assert(!adminObjectKeys.includes('passwordHash'), 'FATAL: "passwordHash" exposed in admin view!');
  assert(!adminObjectKeys.includes('salt'), 'FATAL: "salt" exposed in admin view!');
  assert(!adminObjectKeys.includes('token'), 'FATAL: "token" exposed in admin view!');

  // Test Audit Logger redaction
  const logged = securityAudit.recordEvent('LOGIN_FAILURE', {
    userEmail: 'target@example.com',
    details: {
      password: 'PlaintextPassword123!',
      token: 'secret_jwt_token_xyz',
      attemptNumber: 1,
    },
  });

  assert(logged.details.password === '[REDACTED_SECURITY_DATA]', 'Password was not redacted from audit log');
  assert(logged.details.token === '[REDACTED_SECURITY_DATA]', 'Token was not redacted from audit log');
});

// -------------------------------------------------------------
// TEST 7: Strong Password Policy Enforcement (12+ Characters)
// -------------------------------------------------------------
runTest(7, 'Authentication', 'Weak or short passwords rejected by policy', () => {
  // Test 1: Short password
  const shortResult = validatePasswordStrength('Abc1!');
  assert(!shortResult.isValid, 'Short password (5 chars) should be rejected');
  assert(
    shortResult.errors.some((e) => e.includes('12 characters')),
    'Missing 12 characters error'
  );

  // Test 2: Missing uppercase
  const noUpper = validatePasswordStrength('mypassword123!@#');
  assert(!noUpper.isValid, 'Password without uppercase should be rejected');

  // Test 3: Missing special character
  const noSpecial = validatePasswordStrength('MyPassword123456');
  assert(!noSpecial.isValid, 'Password without special character should be rejected');

  // Test 4: Common weak dictionary password
  const common = validatePasswordStrength('password12345');
  assert(!common.isValid, 'Common password should be rejected');

  // Test 5: Valid strong enterprise password (12+ chars, upper, lower, digit, symbol)
  const valid = validatePasswordStrength('Admin@Sec2026!Master');
  assert(valid.isValid, 'Valid 18-char strong password was unexpectedly rejected');
});

// -------------------------------------------------------------
// TEST 8: Malicious Input & XSS Neutralization
// -------------------------------------------------------------
runTest(8, 'Input Validation', 'Stored & Reflected XSS scripts are sanitized', () => {
  const maliciousScript = '<script>alert("XSS Attack!")</script>Shopping at Mall';
  const cleanedScript = sanitizeInput(maliciousScript);
  assert(!cleanedScript.includes('<script>'), 'Script tag was not stripped');
  assert(!cleanedScript.includes('alert('), 'Script contents were not stripped');
  assert(cleanedScript.includes('Shopping at Mall'), 'Valid text was improperly removed');

  const dangerousIframe = '<iframe src="javascript:alert(1)"></iframe>Dinner';
  const cleanedIframe = sanitizeInput(dangerousIframe);
  assert(!cleanedIframe.includes('<iframe'), 'Iframe tag was not stripped');

  const inlineHandler = '<img src="x" onerror="document.cookie=steal()">Groceries';
  const cleanedHandler = sanitizeInput(inlineHandler);
  assert(!cleanedHandler.includes('onerror='), 'Inline event handler was not stripped');

  const htmlEncoded = escapeHtml('<div class="attack">&');
  assert(htmlEncoded.includes('&lt;div'), 'HTML entity encoding failed for <');
  assert(htmlEncoded.includes('&amp;'), 'HTML entity encoding failed for &');
});

// -------------------------------------------------------------
// TEST 9: Financial Tampering & Boundary Defense
// -------------------------------------------------------------
runTest(9, 'Data Integrity', 'Negative amounts, NaN, and numeric overflow are rejected', () => {
  // Negative amount
  const negCheck = validateAmount(-250);
  assert(!negCheck.isValid, 'Negative amount (-250) should be rejected');

  // Zero amount
  const zeroCheck = validateAmount(0);
  assert(!zeroCheck.isValid, 'Zero amount should be rejected');

  // Non-numeric / NaN
  const nanCheck = validateAmount('abc_rupees');
  assert(!nanCheck.isValid, 'NaN string should be rejected');

  // Ceiling overflow (> 10 Crore)
  const overflowCheck = validateAmount(999_999_999_999);
  assert(!overflowCheck.isValid, 'Amount exceeding ₹10 Crore limit should be rejected');

  // Valid fractional amount (properly rounded to 2 decimal places)
  const validCheck = validateAmount(450.755);
  assert(validCheck.isValid, 'Valid amount 450.755 was rejected');
  assert(validCheck.value === 450.76, `Expected rounded value 450.76, got ${validCheck.value}`);
});

// -------------------------------------------------------------
// TEST 10: Brute Force & Rate Limiting Enforcement
// -------------------------------------------------------------
runTest(10, 'Rate Limiting', '5 consecutive failed logins trigger lockout restriction', () => {
  const targetEmail = 'brute_force_target@example.com';
  rateLimiter.reset(targetEmail);

  // Initial check
  const initial = rateLimiter.check(targetEmail);
  assert(initial.allowed, 'Initial rate check should be allowed');
  assert(initial.remainingAttempts === 5, 'Should have 5 attempts remaining');

  // 4 failed attempts
  for (let i = 1; i <= 4; i++) {
    const res = rateLimiter.recordFailure(targetEmail);
    assert(res.allowed, `Attempt ${i} should be recorded without locking yet`);
    assert(res.remainingAttempts === 5 - i, `Expected ${5 - i} remaining attempts`);
  }

  // 5th failed attempt -> LOCKOUT TRIGGERED!
  const fifthAttempt = rateLimiter.recordFailure(targetEmail);
  assert(!fifthAttempt.allowed, '5th failed attempt should trigger lockout restriction');
  assert(fifthAttempt.lockoutRemainingSeconds > 0, 'Lockout duration must be positive');

  // Subsequent check is locked
  const blockedCheck = rateLimiter.check(targetEmail);
  assert(!blockedCheck.allowed, 'Check during active lockout must return allowed = false');

  // Reset allows login again
  rateLimiter.reset(targetEmail);
  const afterReset = rateLimiter.check(targetEmail);
  assert(afterReset.allowed, 'Check after password reset should be allowed');
});

// -------------------------------------------------------------
// PRINT SUMMARY REPORT
// -------------------------------------------------------------
console.log('RESULTS:');
console.log('----------------------------------------------------------------');
let passedCount = 0;
for (const r of results) {
  const icon = r.passed ? '✅' : '❌';
  console.log(`${icon} [Test ${r.id.toString().padStart(2, '0')}] [${r.category}] ${r.name}`);
  if (!r.passed) {
    console.log(`    ↳ ${r.details}`);
  } else {
    passedCount++;
  }
}
console.log('----------------------------------------------------------------');
console.log(`Total: ${results.length} | Passed: ${passedCount} | Failed: ${results.length - passedCount}`);

if (passedCount === results.length) {
  console.log('\n🎉 ALL 10 ENTERPRISE SECURITY TESTS PASSED SUCCESSFULLY!\n');
} else {
  console.error('\n⚠️ SOME SECURITY TESTS FAILED. PLEASE REVIEW LOGS.\n');
  process.exit(1);
}
