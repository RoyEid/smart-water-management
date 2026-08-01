import { z } from "zod";

// Hard ceiling on every list endpoint. Without it a caller could ask for
// limit=1000000 and pull the whole telemetry collection into memory.
export const MAX_PAGE_SIZE = 100;

export const paginationSchema = {
  page: z.coerce
    .number()
    .int("page must be a whole number.")
    .min(1, "page must be at least 1.")
    .default(1),
  limit: z.coerce
    .number()
    .int("limit must be a whole number.")
    .min(1, "limit must be at least 1.")
    .max(MAX_PAGE_SIZE, `limit must not exceed ${MAX_PAGE_SIZE}.`)
    .default(20),
};

/**
 * Accepts an ISO date string and rejects anything unparseable, so a malformed
 * `from=yesterday` becomes a 400 instead of silently producing an
 * `Invalid Date` that MongoDB would either error on or match nothing.
 */
export const isoDate = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "Must be a valid ISO date string.",
  })
  .transform((value) => new Date(value));

export const objectIdParam = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid identifier.");
