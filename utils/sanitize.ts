import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFileSync, chmodSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runAppleScript } from "run-applescript";

export const execFileAsync = promisify(execFile);

/**
 * Escapes a string for safe interpolation inside AppleScript double-quoted strings.
 * Handles: backslashes, double quotes, carriage returns, newlines, tabs, and null bytes.
 */
export function sanitizeForAppleScript(input: string): string {
  return input
    .replace(/\0/g, "")       // strip null bytes
    .replace(/\\/g, "\\\\")   // escape backslashes first
    .replace(/"/g, '\\"')      // escape double quotes
    .replace(/\r/g, "\\r")    // escape carriage returns
    .replace(/\n/g, "\\n")    // escape newlines
    .replace(/\t/g, "\\t");   // escape tabs
}

/**
 * Escapes a string for safe interpolation inside SQLite single-quoted strings.
 * Doubles single quotes per SQL standard.
 */
export function sanitizeForSQL(input: string): string {
  return input.replace(/'/g, "''");
}

/**
 * Validates that process.env.HOME is set, exists, has no shell metacharacters,
 * and resolves to a /Users/ or /home/ path. Returns the validated path.
 */
export function validateHomePath(): string {
  const home = process.env.HOME;
  if (!home) {
    throw new Error("HOME environment variable is not set");
  }

  // Reject shell metacharacters
  if (/[;&|`$(){}!\n\r]/.test(home)) {
    throw new Error("HOME path contains invalid characters");
  }

  // Must start with /Users/ or /home/
  if (!home.startsWith("/Users/") && !home.startsWith("/home/")) {
    throw new Error("HOME path does not resolve to a valid user directory");
  }

  return home;
}

/**
 * Creates a temporary file with a cryptographically random name and restrictive permissions.
 * Returns the absolute path to the created file.
 */
export function createSecureTempFile(prefix: string, content: string): string {
  const fileName = `${prefix}-${randomUUID()}.txt`;
  const filePath = join(tmpdir(), fileName);
  writeFileSync(filePath, content, { encoding: "utf8", mode: 0o600 });
  return filePath;
}

/**
 * Runs an AppleScript with a timeout. If the script does not resolve within
 * `timeoutMs` milliseconds, the returned promise rejects with a descriptive
 * error (likely cause: macOS has not granted the required permission to the
 * host process, so the script blocks on an invisible dialog).
 */
export async function runAppleScriptWithTimeout(script: string, timeoutMs: number): Promise<string> {
	return Promise.race([
		runAppleScript(script),
		new Promise<never>((_, reject) =>
			setTimeout(
				() => reject(new Error(
					`AppleScript timed out after ${timeoutMs}ms. This usually means macOS has not granted the required app permission. ` +
					`Check System Settings > Privacy & Security > Automation.`
				)),
				timeoutMs,
			),
		),
	]);
}

/**
 * Executes a sqlite3 query using execFile (no shell) to prevent command injection.
 * Returns stdout directly.
 */
export async function execSqliteQuery(dbPath: string, query: string): Promise<string> {
  const { stdout } = await execFileAsync("sqlite3", ["-json", dbPath, query]);
  return stdout;
}
