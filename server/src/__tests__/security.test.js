import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeMetadata } from "../services/auditService.js";
import { serializeUser } from "../utils/serializeUser.js";

/**
 * Guards on the two places secrets could leak — the audit log and the user
 * serializer.
 */

test("audit metadata drops anything credential-shaped", () => {
  const sanitized = sanitizeMetadata({
    from: "viewer",
    to: "controller",
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

  assert.deepEqual(sanitized, { from: "viewer", to: "controller" });
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


