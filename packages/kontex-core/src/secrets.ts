/**
 * Secrets scanner — Stage 1 of the quality gate.
 *
 * Pattern-based, runs in-process, no external calls, under 5ms.
 * Every write to `.context/` passes through this.
 */

import type { SecretsScanResult } from "./types.js";

// ─── Built-in Patterns ────────────────────────────────────────────────────

interface SecretPattern {
  name: string;
  regex: RegExp;
}

const SECRET_PATTERNS: SecretPattern[] = [
  { name: "generic-long-token",    regex: /['"]\w{32,}['"]/ },
  { name: "api-key-assignment",    regex: /api[_-]?key\s*[:=]\s*['"]?\w+/i },
  { name: "secret-key-assignment", regex: /secret[_-]?key\s*[:=]\s*['"]?\w+/i },
  { name: "password-assignment",   regex: /password\s*[:=]\s*['"]?[^\s'"]{8,}/i },
  { name: "postgres-connection",   regex: /postgres:\/\/[^@]+:[^@]+@/ },
  { name: "mysql-connection",      regex: /mysql:\/\/[^@]+:[^@]+@/ },
  { name: "mongodb-connection",    regex: /mongodb\+srv:\/\/[^@]+:[^@]+@/ },
  { name: "openai-key",            regex: /sk-[a-zA-Z0-9]{40,}/ },
  { name: "github-personal-token", regex: /ghp_[a-zA-Z0-9]{36}/ },
  { name: "aws-access-key",        regex: /AKIA[A-Z0-9]{16}/ },
];

// ─── Public API ────────────────────────────────────────────────────────────

function buildExtraPatterns(extraPatterns: string[]): SecretPattern[] {
  const result: SecretPattern[] = [];
  for (const pattern of extraPatterns) {
    try {
      result.push({ name: `custom:${pattern.slice(0, 30)}`, regex: new RegExp(pattern) });
    } catch { /* invalid regex — skip */ }
  }
  return result;
}

/**
 * Scans content for credential patterns. Returns immediately on first match.
 */
export function scanForSecrets(
  content: string,
  extraPatterns: string[] = [],
): SecretsScanResult {
  const allPatterns = [...SECRET_PATTERNS, ...buildExtraPatterns(extraPatterns)];

  for (const { name, regex } of allPatterns) {
    if (regex.test(content)) {
      return { blocked: true, pattern: name };
    }
  }

  return { blocked: false };
}
