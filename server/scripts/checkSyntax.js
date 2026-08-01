import { readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Parses every server source file with `node --check`.
 *
 * The backend has no build step, so a syntax error would otherwise only be
 * discovered when the affected module happened to be imported at runtime.
 */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.resolve(__dirname, "../src");

function collectJsFiles(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...collectJsFiles(fullPath));
    } else if (entry.endsWith(".js")) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = collectJsFiles(SRC_DIR);
const failures = [];

for (const file of files) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (error) {
    failures.push({ file, message: error.stderr?.toString() || error.message });
  }
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`FAIL ${path.relative(SRC_DIR, failure.file)}\n${failure.message}`);
  }
  console.error(`\n${failures.length} of ${files.length} file(s) failed to parse.`);
  process.exit(1);
}

console.log(`All ${files.length} server source files parse cleanly.`);
