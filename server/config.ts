const HTTP_PROTOCOLS = new Set(["http:", "https:"]);

export function getPublicAppUrl(env: NodeJS.ProcessEnv = process.env): URL {
  const value = env.PUBLIC_APP_URL;
  if (!value) {
    throw new Error("Missing required environment variable: PUBLIC_APP_URL");
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
