import test from "node:test";
import assert from "node:assert/strict";
import {
  sendMemberAddedEmail,
  sendMemberRoleChangedEmail,
  sendMemberRemovedEmail,
} from "../services/emailService.js";

test("sendMemberAddedEmail sends email with correct Controller copy and subject", async () => {
  const result = await sendMemberAddedEmail({
    email: "roy.eid02@gmail.com",
    recipientName: "Roy Eid",
    ownerName: "Roy Eid",
    deviceName: "house",
    deviceId: "tank-01",
    role: "controller",
  });

  assert.ok(result);
  assert.ok(result.messageId);
});

test("sendMemberAddedEmail sends email with correct Viewer copy and subject", async () => {
  const result = await sendMemberAddedEmail({
    email: "mom@example.com",
    recipientName: "Mom",
    ownerName: "Roy Eid",
    deviceName: "house",
    deviceId: "tank-01",
    role: "viewer",
  });

  assert.ok(result);
  assert.ok(result.messageId);
});

test("sendMemberRoleChangedEmail sends email with previous and new role details", async () => {
  const result = await sendMemberRoleChangedEmail({
    email: "roy.eid02@gmail.com",
    recipientName: "Roy Eid",
    ownerName: "Roy Eid",
    deviceName: "house",
    deviceId: "tank-01",
    previousRole: "viewer",
    newRole: "controller",
  });

  assert.ok(result);
  assert.ok(result.messageId);
});

test("sendMemberRemovedEmail sends removal notice email", async () => {
  const result = await sendMemberRemovedEmail({
    email: "roy.eid02@gmail.com",
    recipientName: "Roy Eid",
    ownerName: "Roy Eid",
    deviceName: "house",
    deviceId: "tank-01",
  });

  assert.ok(result);
  assert.ok(result.messageId);
});
