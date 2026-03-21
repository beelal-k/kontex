/**
 * GitHub OAuth Device Flow authentication + OS keychain storage.
 *
 * Uses `@octokit/auth-oauth-device` for the device flow and `keytar`
 * for secure token storage in the OS native keychain.
 */

import keytar from "keytar";

const KEYCHAIN_SERVICE = "kontex";
const KEYCHAIN_ACCOUNT = "github-oauth";

/**
 * Replace this with your registered GitHub OAuth App client_id.
 * Register at: https://github.com/settings/developers
 */
const GITHUB_CLIENT_ID = "Ov23liMXcybhETe03nNJ";

/**
 * Runs the full GitHub OAuth Device Flow.
 */
export async function login(): Promise<string> {
  const { createOAuthDeviceAuth } = await import("@octokit/auth-oauth-device");

  const auth = createOAuthDeviceAuth({
    clientType: "oauth-app",
    clientId: GITHUB_CLIENT_ID,
    scopes: [],
    onVerification: (verification) => {
      console.log(`\nVisit: ${verification.verification_uri}`);
      console.log(`Code:  ${verification.user_code}\n`);
      console.log("Waiting for authorization...\n");
      openBrowser(verification.verification_uri).catch(() => {});
    },
  });

  const { token } = await auth({ type: "oauth" });
  await keytar.setPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT, token);

  const username = await fetchGitHubUsername(token);
  console.log(`✓ Authenticated as @${username}`);
  console.log("✓ GitHub Models access confirmed");
  return username;
}

/**
 * Removes the GitHub OAuth token from the OS keychain.
 */
export async function logout(): Promise<void> {
  const deleted = await keytar.deletePassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);
  console.log(deleted ? "✓ Token removed from keychain" : "No token found in keychain");
}

/**
 * Retrieves the stored GitHub OAuth token, or null if not authenticated.
 */
export async function getToken(): Promise<string | null> {
  return keytar.getPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);
}

/**
 * Checks whether a valid GitHub token exists in the keychain.
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return token !== null;
}

// ─── Internal Helpers ──────────────────────────────────────────────────────

async function fetchGitHubUsername(token: string): Promise<string> {
  const response = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`GitHub API returned ${response.status}`);
  const data = (await response.json()) as { login: string };
  return data.login;
}

async function openBrowser(url: string): Promise<void> {
  const { execFile } = await import("node:child_process");
  const [cmd, ...args]: string[] =
    process.platform === "darwin" ? ["open", url] :
    process.platform === "win32" ? ["cmd", "/c", "start", "", url] :
    ["xdg-open", url];
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (error) => { if (error) reject(error); else resolve(); });
  });
}
