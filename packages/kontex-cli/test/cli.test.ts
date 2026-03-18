import { describe, test, expect } from "bun:test";
import { join } from "node:path";

const CLI_PATH = join(import.meta.dir, "..", "src", "index.ts");

function runCLI(args: string[]): { stdout: string; stderr: string; exitCode: number } {
  const proc = Bun.spawnSync(["bun", "run", CLI_PATH, ...args], {
    cwd: join(import.meta.dir, ".."),
    stdout: "pipe",
    stderr: "pipe",
  });
  return {
    stdout: new TextDecoder().decode(proc.stdout),
    stderr: new TextDecoder().decode(proc.stderr),
    exitCode: proc.exitCode,
  };
}

describe("CLI", () => {
  test("--help outputs usage information", () => {
    const result = runCLI(["--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("kontex");
    expect(result.stdout).toContain("Persistent, git-native memory");
  });

  test("--version outputs the version number", () => {
    const result = runCLI(["--version"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("1.0.0");
  });

  test("unknown command shows help", () => {
    const result = runCLI(["nonexistent-command"]);
    // Commander outputs an error for unknown commands
    expect(result.exitCode).not.toBe(0);
  });

  test("compile --help shows options", () => {
    const result = runCLI(["compile", "--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("--budget");
    expect(result.stdout).toContain("Regenerate");
  });

  test("find --help shows options", () => {
    const result = runCLI(["find", "--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("--limit");
    expect(result.stdout).toContain("Semantic search");
  });

  test("status --help shows description", () => {
    const result = runCLI(["status", "--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("memory store health");
  });

  test("hooks --help shows usage", () => {
    const result = runCLI(["hooks", "--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("install");
  });
});
