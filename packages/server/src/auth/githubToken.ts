import { createSign } from "crypto";

interface GitHubAppTokenOptions {
  appId: string;
  privateKey: string;
  repository: string;
}

interface CachedToken {
  token: string;
  expiresAt: Date;
}

// In-memory cache for the token
let tokenCache: CachedToken | null = null;

/**
 * Generate a JWT token for GitHub App authentication
 */
function generateJWT(appId: string, privateKey: string): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 30, // Issued at time (30 seconds in the past to allow for clock skew)
    exp: now + 540, // Expiration time (9 minutes from now, max 10 minutes allowed by GitHub)
    iss: appId, // Issuer (GitHub App ID)
  };

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const encodedHeader = Buffer.from(JSON.stringify(header))
    .toString("base64url");
  const encodedPayload = Buffer.from(JSON.stringify(payload))
    .toString("base64url");

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const sign = createSign("RSA-SHA256");
  sign.update(signatureInput);
  sign.end();

  const signature = sign.sign(privateKey, "base64url");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * List all installations for the GitHub App
 */
async function listInstallations(jwt: string): Promise<Array<{
  id: number;
  account: { login: string; type: string };
  repository_selection: string;
  repositories_url: string;
}>> {
  const response = await fetch(
    "https://api.github.com/app/installations",
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Failed to list installations: ${response.status} ${response.statusText}\n${error}`,
    );
  }

  const data = await response.json();
  return data;
}

/**
 * Get installation ID for a repository
 */
async function getInstallationId(
  jwt: string,
  repository: string,
): Promise<number> {
  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    throw new Error(
      `Invalid repository format: ${repository}. Expected format: owner/repo`,
    );
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/installation`,
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      // If we can't get installation ID for specific repository, try using the first installation we found
      const installations = await listInstallations(jwt).catch(() => []);
      if (installations.length > 0) {
        return installations[0].id;
      }
      throw new Error(
        `GitHub App is not installed on repository: ${repository}`,
      );
    }
    const error = await response.text();
    throw new Error(
      `Failed to get installation ID: ${response.status} ${response.statusText}\n${error}`,
    );
  }

  const data = await response.json();
  return data.id;
}

/**
 * Generate an installation access token
 */
async function getInstallationToken(
  jwt: string,
  installationId: number,
  repository?: string,
): Promise<{ token: string; expiresAt: string }> {
  const permissions: Record<string, string> = {
    contents: "write",
    metadata: "read",
  };

  const requestBody: {
    permissions?: Record<string, string>;
    repository?: string;
  } = {
    permissions,
  };

  if (repository) {
    requestBody.repository = repository;
  }

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    },
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(
      `Failed to get installation token: ${response.status} ${response.statusText}\n${error}`,
    );
  }

  const data = await response.json();
  return {
    token: data.token,
    expiresAt: data.expires_at,
  };
}

/**
 * Generate a GitHub token from a GitHub App
 * This function is not cached - use getCachedGitHubToken instead
 */
async function generateGitHubToken(
  options: GitHubAppTokenOptions,
): Promise<{ token: string; expiresAt: string }> {
  const { appId, privateKey, repository } = options;

  const jwt = generateJWT(appId, privateKey);

  let installationId: number;
  try {
    installationId = await getInstallationId(jwt, repository);
  } catch (error) {
    // If we can't get installation ID for specific repository, try using the first installation we found
    const installations = await listInstallations(jwt).catch(() => []);
    if (installations.length > 0) {
      installationId = installations[0].id;
    } else {
      throw error;
    }
  }

  const result = await getInstallationToken(jwt, installationId, repository);
  return result;
}

/**
 * Get a cached GitHub token, generating a new one if needed
 * The token is cached in memory and automatically refreshed when it expires
 */
export async function getCachedGitHubToken(
  options: GitHubAppTokenOptions,
): Promise<string> {
  const now = new Date();

  // Check if we have a valid cached token
  if (tokenCache && tokenCache.expiresAt > now) {
    // Add a 5-minute buffer before expiration to refresh early
    const bufferTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    const refreshTime = new Date(tokenCache.expiresAt.getTime() - bufferTime);

    if (now < refreshTime) {
      return tokenCache.token;
    }
  }

  // Generate a new token
  const { token, expiresAt } = await generateGitHubToken(options);

  // Cache the token
  tokenCache = {
    token,
    expiresAt: new Date(expiresAt),
  };

  return token;
}

