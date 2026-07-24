import crypto from "crypto";

export function generateSixDigitCode() {
  // Generates a random integer between 100000 (inclusive) and 1000000 (exclusive)
  return crypto.randomInt(100000, 1000000).toString();
}
