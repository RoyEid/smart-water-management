import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeMetadata } from "../services/auditService.js";
import { serializeUser } from "../utils/serializeUser.js";
import { requireAdmin } from "../middleware/authenticate.js";

/**
 * Guards on the two places secrets could leak — the audit log and the user
 * serializer — plus the admin authorization check.
 */

test("audit metadata drops anything credential-shaped", () => {
  const sanitized = sanitizeMetadata({
    from: "user",
    to: "admin",
    password: "hunter2",
    newPassword: "hunter3",
    currentPassword: "hunter1",
    resetToken: "abc",
    codeHash: "def",
    apiKey: "ghi",
    deviceKey: "jkl",
    authorization: "Bearer x",
    cookie: "auth_token=x",
    secret: "s",
  });

  assert.deepEqual(sanitized, { from: "user", to: "admin" });
});

test("audit metadata keeps only primitives and truncates long strings", () => {
  const sanitized = sanitizeMetadata({
    ok: true,
    count: 3,
    nothing: null,
    nested: { a: 1 },
    huge: "x".repeat(500),
  });

  assert.equal(sanitized.ok, true);
  assert.equal(sanitized.count, 3);
  assert.equal(sanitized.nothing, null);
  assert.equal("nested" in sanitized, false, "nested objects must not be stored");
  assert.equal(sanitized.huge.length, 300);
});

test("the user serializer never emits the password or any token field", () => {
  const serialized = serializeUser({
    _id: "abc",
    name: "Ada",
    email: "ada@example.com",
    role: "admin",
    isVerified: true,
    password: "$2a$12$hashed",
    emailVerificationCodeHash: "codehash",
    passwordResetTokenHash: "tokenhash",
    passwordResetCodeHash: "resethash",
    googleId: "g1",
  });

  const asText = JSON.stringify(serialized);
  for (const secret of ["$2a$12$hashed", "codehash", "tokenhash", "resethash"]) {
    assert.ok(!asText.includes(secret), `serialized user leaked ${secret}`);
  }
  assert.equal(serialized.connectedProviders.google, true);
  assert.equal(serialized.connectedProviders.github, false);
});

test("hasPassword is a boolean flag, never the hash itself", () => {
  const withPassword = serializeUser(
    { _id: "1", password: "$2a$12$hashed" },
    { includePasswordFlag: true }
  );
  const withoutPassword = serializeUser({ _id: "2" }, { includePasswordFlag: true });

  assert.equal(withPassword.hasPassword, true);
  assert.equal(withoutPassword.hasPassword, false);
  assert.equal(JSON.stringify(withPassword).includes("$2a$12$"), false);
});

test("requireAdmin answers 401 with no user and 403 for a non-admin", () => {
  const captured = [];
  const next = (error) => captured.push(error);

  requireAdmin({}, {}, next);
  assert.equal(captured[0].statusCode, 401);

  requireAdmin({ user: { role: "user" } }, {}, next);
  assert.equal(captured[1].statusCode, 403);
});

test("requireAdmin passes an admin through with no error", () => {
  let called = false;
  let error;
  requireAdmin({ user: { role: "admin" } }, {}, (err) => {
    called = true;
    error = err;
  });

  assert.equal(called, true);
  assert.equal(error, undefined);
});
