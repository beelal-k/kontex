/**
 * SQLite + sqlite-vec database setup for kontex.
 *
 * Uses Bun's built-in `bun:sqlite` driver with the `sqlite-vec` C extension
 * for vector similarity search. The database lives at `.kontex-index/index.db`.
 */

import { Database } from "bun:sqlite";
import { join, dirname } from "node:path";
import { existsSync, mkdirSync } from "node:fs";

const INDEX_DIR = ".kontex-index";
const DB_FILENAME = "index.db";
export const EMBEDDING_DIM = 384;

let dbInstance: Database | null = null;

/**
 * Returns the SQLite database instance, creating it if needed.
 */
export function getDatabase(workspaceRoot: string): Database {
  if (dbInstance) return dbInstance;

  const indexDir = join(workspaceRoot, INDEX_DIR);
  if (!existsSync(indexDir)) mkdirSync(indexDir, { recursive: true });

  const db = new Database(join(indexDir, DB_FILENAME));
  db.exec("PRAGMA journal_mode=WAL");
  db.exec("PRAGMA synchronous=NORMAL");

  tryLoadVecExtension(db);
  runMigrations(db);

  dbInstance = db;
  return db;
}

/**
 * Closes the database connection and clears the singleton.
 */
export function closeDatabase(): void {
  if (dbInstance) { dbInstance.close(); dbInstance = null; }
}

// ─── Migrations ────────────────────────────────────────────────────────────

function runMigrations(db: Database): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)`);
  const currentVersion = db.prepare("SELECT COALESCE(MAX(version), 0) as v FROM schema_version").get() as { v: number };
  if (currentVersion.v < 1) migrateV1(db);
}

function migrateV1(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      uri TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('decision', 'pattern', 'gotcha', 'convention', 'resource')),
      l0 TEXT NOT NULL DEFAULT '',
      l1 TEXT NOT NULL DEFAULT '',
      l2 TEXT NOT NULL DEFAULT '',
      confidence REAL NOT NULL DEFAULT 0.0,
      verified INTEGER NOT NULL DEFAULT 0,
      stale INTEGER NOT NULL DEFAULT 0,
      global INTEGER NOT NULL DEFAULT 0,
      ref_count INTEGER NOT NULL DEFAULT 0,
      author TEXT NOT NULL DEFAULT '',
      affected_paths TEXT NOT NULL DEFAULT '[]',
      tags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  try {
    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memory_embeddings USING vec0(
        uri TEXT PRIMARY KEY,
        embedding float[${EMBEDDING_DIM}]
      )
    `);
  } catch { /* sqlite-vec not available */ }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_memories_verified ON memories(verified)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_memories_stale ON memories(stale)`);
  db.exec("INSERT INTO schema_version (version) VALUES (1)");
}

// ─── Extension Loading ────────────────────────────────────────────────────

import * as sqliteVec from "sqlite-vec";

function tryLoadVecExtension(db: Database): void {
  try {
    const extPath = sqliteVec.getLoadablePath();
    db.loadExtension(extPath);
  } catch (err: any) {
    console.warn(`kontex: sqlite-vec extension not available (${err?.message || "unknown error"}). Semantic search will use keyword matching.`);
  }
}
