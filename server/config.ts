const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

function getReplitAppUrl(env: NodeJS.ProcessEnv): string | undefined {
  const deploymentDomain = env.REPLIT_DOMAINS
    ?.split(",")
    .map((domain) => domain.trim())
    .find(Boolean);
  const domain = deploymentDomain || env.REPLIT_DEV_DOMAIN?.trim();

  return domain ? `https://${domain}` : undefined;
}

export function getPublicAppUrl(env: NodeJS.ProcessEnv = process.env): URL {
  // Replit supplies its public domains to deployments automatically. Keep the
  // explicit value as the highest-priority override for custom domains and for
  // hosts outside Replit.
  const value = env.PUBLIC_APP_URL?.trim() || getReplitAppUrl(env);
  if (!value) {
    throw new Error(
      "Missing public URL configuration: set PUBLIC_APP_URL or deploy with REPLIT_DOMAINS",
    );
  }

  const url = new URL(value);
  if (!HTTP_PROTOCOLS.has(url.protocol)) {
    throw new Error("PUBLIC_APP_URL must use http or https");
  }

  return url;
}

export function getPublicAppOrigin(env: NodeJS.ProcessEnv = process.env): string {
  return getPublicAppUrl(env).origin;
}
