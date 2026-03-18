import { describe, test, expect } from "bun:test";
import { scanForSecrets } from "../src/secrets";

describe("scanForSecrets", () => {
  test("blocks OpenAI API keys", () => {
    const r = scanForSecrets("The key is sk-abcdefghijklmnopqrstuvwxyz1234567890ABCDEF");
    expect(r.blocked).toBe(true);
    expect(r.pattern).toBe("openai-key");
  });

  test("blocks GitHub personal access tokens", () => {
    const r = scanForSecrets("token: ghp_abcdefghijklmnopqrstuvwxyz1234567890");
    expect(r.blocked).toBe(true);
    expect(r.pattern).toBe("github-personal-token");
  });

  test("blocks AWS access keys", () => {
    const r = scanForSecrets("aws key: AKIAIOSFODNN7EXAMPLE");
    expect(r.blocked).toBe(true);
    expect(r.pattern).toBe("aws-access-key");
  });

  test("blocks PostgreSQL connection strings", () => {
    const r = scanForSecrets("DATABASE_URL=postgres://user:password@localhost:5432/db");
    expect(r.blocked).toBe(true);
    expect(r.pattern).toBe("postgres-connection");
  });

  test("blocks MongoDB connection strings", () => {
    const r = scanForSecrets("MONGO_URI=mongodb+srv://admin:secret@cluster.mongodb.net");
    expect(r.blocked).toBe(true);
    expect(r.pattern).toBe("mongodb-connection");
  });

  test("blocks MySQL connection strings", () => {
    const r = scanForSecrets("mysql://root:password@localhost/mydb");
    expect(r.blocked).toBe(true);
    expect(r.pattern).toBe("mysql-connection");
  });

  test("blocks API key assignments", () => {
    const r = scanForSecrets("api_key = 'my-secret-key-value'");
    expect(r.blocked).toBe(true);
    expect(r.pattern).toBe("api-key-assignment");
  });

  test("blocks password assignments", () => {
    const r = scanForSecrets('password = "my-secure-password123"');
    expect(r.blocked).toBe(true);
    expect(r.pattern).toBe("password-assignment");
  });

  test("allows normal code content", () => {
    expect(scanForSecrets("function getUser(id: string) { return db.users.find(id); }").blocked).toBe(false);
  });

  test("allows architectural decisions", () => {
    expect(scanForSecrets("We chose PostgreSQL over MongoDB because JSONB gives us flexible fields.").blocked).toBe(false);
  });

  test("allows pattern descriptions", () => {
    expect(scanForSecrets("All API endpoints use the /api/v1 prefix.").blocked).toBe(false);
  });

  test("supports custom patterns from config", () => {
    const r = scanForSecrets("Use COMPANY_INTERNAL_TOKEN_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456", ["COMPANY_INTERNAL_TOKEN_[A-Z0-9]{32}"]);
    expect(r.blocked).toBe(true);
    expect(r.pattern).toStartWith("custom:");
  });

  test("handles invalid custom patterns gracefully", () => {
    expect(scanForSecrets("normal content", ["[invalid regex"]).blocked).toBe(false);
  });
});
