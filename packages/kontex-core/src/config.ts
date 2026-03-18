/**
 * Configuration loading, validation, and defaults for kontex.
 *
 * Reads `kontex.config.json` from the workspace root, merges with
 * sensible defaults, and validates the result. All config values
 * have defaults so the file can be empty or absent.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// ─── Type Definitions ──────────────────────────────────────────────────────

export interface CompileConfig {
  tokenBudget: number;
  alwaysInclude: string[];
  excludePaths: string[];
}

export interface EmbeddingConfig {
  provider: "local" | "ollama";
  model: string;
}

export interface LLMConfig {
  provider: "github-models" | "ollama" | "openai" | "anthropic" | "none";
  model: string;
  apiKey?: string;
}

export interface QualityConfig {
  minConfidence: number;
  autoVerifyThreshold: number;
  deduplicateThreshold: number;
  contradictionThreshold: number;
}

export interface HooksConfig {
  postCommitExtract: boolean;
  postMergeRecompile: boolean;
  maxBackgroundRetries: number;
}

export interface SecretsConfig {
  scan: boolean;
  extraPatterns: string[];
}

export interface DecayConfig {
  sessionArchiveDays: number;
  unverifiedExpireDays: number;
  maxSessionsDirKB: number;
}

export interface KontexConfig {
  compile: CompileConfig;
  embedding: EmbeddingConfig;
  llm: LLMConfig;
  quality: QualityConfig;
  hooks: HooksConfig;
  secrets: SecretsConfig;
  decay: DecayConfig;
}

// ─── Defaults ──────────────────────────────────────────────────────────────

export const DEFAULT_CONFIG: KontexConfig = {
  compile: {
    tokenBudget: 3000,
    alwaysInclude: ["memory/project.md"],
    excludePaths: ["memory/sessions/archive/"],
  },
  embedding: {
    provider: "local",
    model: "Xenova/all-MiniLM-L6-v2",
  },
  llm: {
    provider: "github-models",
    model: "gpt-4o-mini",
  },
  quality: {
    minConfidence: 0.60,
    autoVerifyThreshold: 0.85,
    deduplicateThreshold: 0.92,
    contradictionThreshold: 0.75,
  },
  hooks: {
    postCommitExtract: true,
    postMergeRecompile: true,
    maxBackgroundRetries: 2,
  },
  secrets: {
    scan: true,
    extraPatterns: [],
  },
  decay: {
    sessionArchiveDays: 7,
    unverifiedExpireDays: 30,
    maxSessionsDirKB: 500,
  },
};

// ─── Config File Name ──────────────────────────────────────────────────────

const CONFIG_FILENAME = "kontex.config.json";

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Resolves environment variable references like `${ENV_VAR}` in string values.
 */
function resolveEnvVars(value: string): string {
  return value.replace(/\$\{(\w+)\}/g, (_, envKey) => {
    return process.env[envKey] ?? "";
  });
}

/**
 * Deep-merges a partial config over defaults, preserving type safety.
 */
function deepMerge<T extends Record<string, unknown>>(defaults: T, overrides: Partial<T>): T {
  const result = { ...defaults };

  for (const key of Object.keys(overrides) as Array<keyof T>) {
    const overrideVal = overrides[key];
    const defaultVal = defaults[key];

    if (
      overrideVal !== undefined &&
      typeof overrideVal === "object" &&
      !Array.isArray(overrideVal) &&
      typeof defaultVal === "object" &&
      !Array.isArray(defaultVal) &&
      defaultVal !== null
    ) {
      result[key] = deepMerge(
        defaultVal as Record<string, unknown>,
        overrideVal as Record<string, unknown>,
      ) as T[keyof T];
    } else if (overrideVal !== undefined) {
      result[key] = overrideVal as T[keyof T];
    }
  }

  return result;
}

/**
 * Loads `kontex.config.json` from the workspace root and merges with defaults.
 * Returns the full default config if the file does not exist.
 */
export function loadConfig(workspaceRoot: string): KontexConfig {
  const configPath = join(workspaceRoot, CONFIG_FILENAME);

  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const merged = deepMerge(DEFAULT_CONFIG as any, parsed as any) as KontexConfig;

    if (merged.llm && merged.llm.apiKey) {
      merged.llm.apiKey = resolveEnvVars(merged.llm.apiKey);
    }

    return merged;
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Writes the full config object to `kontex.config.json`.
 */
export function writeConfig(workspaceRoot: string, config: KontexConfig): void {
  const configPath = join(workspaceRoot, CONFIG_FILENAME);
  const serializable = { ...config };
  writeFileSync(configPath, JSON.stringify(serializable, null, 2) + "\n", "utf-8");
}
