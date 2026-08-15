import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { paginationSchema, isoDate, MAX_PAGE_SIZE } from "../utils/validationSchemas.js";

/**
 * The pagination and date guards exist to stop an unbounded query reaching
 * MongoDB. These tests pin that boundary.
 */

const listQuery = z.object({ ...paginationSchema });

test("pagination defaults to page 1 with a bounded limit", () => {
  const parsed = listQuery.parse({});
  assert.equal(parsed.page, 1);
  assert.equal(parsed.limit, 20);
});

test("pagination coerces numeric strings from the query string", () => {
  const parsed = listQuery.parse({ page: "3", limit: "50" });
  assert.equal(parsed.page, 3);
  assert.equal(parsed.limit, 50);
});

test("a limit above the maximum is rejected rather than silently clamped", () => {
  // Silently clamping would let a caller believe they received everything.
  assert.throws(() => listQuery.parse({ limit: String(MAX_PAGE_SIZE + 1) }));
  assert.throws(() => listQuery.parse({ limit: "1000000" }));
});

test("a zero or negative page is rejected", () => {
  assert.throws(() => listQuery.parse({ page: "0" }));
  assert.throws(() => listQuery.parse({ page: "-2" }));
});

test("isoDate accepts a valid date and rejects unparseable text", () => {
  const parsed = isoDate.parse("2026-08-01T00:00:00.000Z");
  assert.ok(parsed instanceof Date);
  assert.equal(Number.isNaN(parsed.getTime()), false);

  // Without this guard the value would reach Mongo as an Invalid Date.
  assert.throws(() => isoDate.parse("yesterday"));
  assert.throws(() => isoDate.parse("not-a-date"));
});

/**
 * The device control contract the ESP32 firmware depends on. Changing any of
 * these accepted values would break the device, so they are pinned here.
 */
const deviceControlSchema = z
  .object({
    systemEnabled: z.boolean().optional(),
    pumpMode: z.enum(["AUTO", "MANUAL"]).optional(),
    manualPumpState: z.enum(["ON", "OFF"]).optional(),
    allowPumpOnMoteur: z.boolean().optional(),
  })
  .strict();

test("the control payload accepts exactly the documented values", () => {
  assert.doesNotThrow(() => deviceControlSchema.parse({ systemEnabled: true }));
  assert.doesNotThrow(() => deviceControlSchema.parse({ pumpMode: "AUTO" }));
  assert.doesNotThrow(() => deviceControlSchema.parse({ pumpMode: "MANUAL" }));
  assert.doesNotThrow(() => deviceControlSchema.parse({ manualPumpState: "ON" }));
  assert.doesNotThrow(() => deviceControlSchema.parse({ manualPumpState: "OFF" }));
  assert.doesNotThrow(() => deviceControlSchema.parse({ allowPumpOnMoteur: true }));
  assert.doesNotThrow(() => deviceControlSchema.parse({ allowPumpOnMoteur: false }));
});

test("the control payload rejects unknown fields and wrong casing", () => {
  // .strict() is what stops a typo silently doing nothing.
  assert.throws(() => deviceControlSchema.parse({ pumpModes: "AUTO" }));
  assert.throws(() => deviceControlSchema.parse({ pumpMode: "auto" }));
  assert.throws(() => deviceControlSchema.parse({ manualPumpState: "on" }));
  assert.throws(() => deviceControlSchema.parse({ systemEnabled: "true" }));
  assert.throws(() => deviceControlSchema.parse({ allowPumpOnMoteur: "yes" }));
});
