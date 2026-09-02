import type { NextFunction, Request, Response } from "express";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "admin_session";
const MIN_PASSWORD_LENGTH = 12;
const MIN_SECRET_LENGTH = 32;
const ABSOLUTE_TIMEOUT = 12 * 60 * 60 * 1000;
const IDLE_TIMEOUT = 30 * 60 * 1000;
const RATE_WINDOW = 15 * 60 * 1000;
const MAX_IP_FAILURES = 12;
const MAX_ACCOUNT_FAILURES = 5;

type Session = { admin: true; createdAt: number; lastSeenAt: number };
type Attempt = { failures: number; windowStartedAt: number; blockedUntil: number };

export type AuthOptions = {
  password: string;
  sessionSecret: string;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  absoluteTimeoutMs?: number;
  idleTimeoutMs?: number;
};

function assertStrong(name: string, value: string | undefined, minimum: number) {
  if (!value || value.length < minimum) {
    throw new Error(`${name} is required and must contain at least ${minimum} characters`);
  }
}

/** Validate secrets eagerly from server/index.ts, before the HTTP server starts. */
export function validateAuthConfiguration(env: NodeJS.ProcessEnv = process.env): AuthOptions {
  assertStrong("ADMIN_PASSWORD", env.ADMIN_PASSWORD, MIN_PASSWORD_LENGTH);
  assertStrong("AUTH_SESSION_SECRET", env.AUTH_SESSION_SECRET, MIN_SECRET_LENGTH);
  return { password: env.ADMIN_PASSWORD!, sessionSecret: env.AUTH_SESSION_SECRET! };
}

function parseCookie(header: string | undefined, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
}

export function createAuthService(options: AuthOptions) {
  assertStrong("ADMIN_PASSWORD", options.password, MIN_PASSWORD_LENGTH);
  assertStrong("AUTH_SESSION_SECRET", options.sessionSecret, MIN_SECRET_LENGTH);
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const absoluteTimeout = options.absoluteTimeoutMs ?? ABSOLUTE_TIMEOUT;
  const idleTimeout = options.idleTimeoutMs ?? IDLE_TIMEOUT;
  const salt = createHmac("sha256", options.sessionSecret).update("admin-password-v1").digest();
  // Only the memory-hard password fingerprint is retained by the service.
  const passwordHash = scryptSync(options.password, salt, 64);
  const sessions = new Map<string, Session>();
  const attempts = new Map<string, Attempt>();

  const sessionKey = (token: string) => createHmac("sha256", options.sessionSecret).update(token).digest("hex");
  const tokenFrom = (req: Request) => parseCookie(req.headers.cookie, COOKIE_NAME);
  const clearCookie = (res: Response) => res.clearCookie(COOKIE_NAME, {
    httpOnly: true, secure: true, sameSite: "strict", path: "/",
  });
  const setCookie = (res: Response, token: string) => res.cookie(COOKIE_NAME, token, {
    httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: absoluteTimeout,
  });

  function revoke(req: Request) {
    const token = tokenFrom(req);
    return token ? sessions.delete(sessionKey(token)) : false;
  }

  function sessionFor(req: Request): Session | undefined {
    const token = tokenFrom(req);
    if (!token) return;
    const key = sessionKey(token);
    const session = sessions.get(key);
    if (!session) return;
    const time = now();
    if (time - session.createdAt >= absoluteTimeout || time - session.lastSeenAt >= idleTimeout) {
      sessions.delete(key);
      return;
    }
    session.lastSeenAt = time;
    return session;
  }

  function attemptFor(key: string): Attempt {
    const time = now();
    const existing = attempts.get(key);
    if (!existing || time - existing.windowStartedAt >= RATE_WINDOW) {
      const fresh = { failures: 0, windowStartedAt: time, blockedUntil: 0 };
      attempts.set(key, fresh);
      return fresh;
    }
    return existing;
  }

  async function loginHandler(req: Request, res: Response) {
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    // This application has one privileged account; never let a supplied label bypass its bucket.
    const account = "admin";
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const ipAttempt = attemptFor(`ip:${ip}`);
    const accountAttempt = attemptFor(`account:${account}`);
    const time = now();
    if (ipAttempt.failures >= MAX_IP_FAILURES || accountAttempt.failures >= MAX_ACCOUNT_FAILURES ||
        ipAttempt.blockedUntil > time || accountAttempt.blockedUntil > time) {
      res.setHeader("Retry-After", "60");
      return res.status(429).json({ error: "Trop de tentatives, veuillez réessayer plus tard" });
    }

    const supplied = scryptSync(password, salt, 64);
    if (!timingSafeEqual(supplied, passwordHash)) {
      ipAttempt.failures++;
      accountAttempt.failures++;
      const delay = Math.min(2 ** Math.max(ipAttempt.failures, accountAttempt.failures) * 50, 2_000);
      ipAttempt.blockedUntil = accountAttempt.blockedUntil = time + delay;
      console.warn("[auth] login failure", { ip, account, failures: accountAttempt.failures });
      await sleep(delay);
      // The enforced delay has elapsed; the failure counters still provide the window limit.
      ipAttempt.blockedUntil = accountAttempt.blockedUntil = 0;
      return res.status(401).json({ error: "Identifiants incorrects" });
    }

    // Revoke any previous cookie before issuing a newly rotated session identifier.
    revoke(req);
    attempts.delete(`ip:${ip}`);
    attempts.delete(`account:${account}`);
    const token = randomBytes(32).toString("base64url");
    sessions.set(sessionKey(token), { admin: true, createdAt: now(), lastSeenAt: now() });
    setCookie(res, token);
    return res.json({ authenticated: true });
  }

  function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!sessionFor(req)) {
      clearCookie(res);
      return res.status(401).json({ error: "Non autorisé" });
    }
    next();
  }

  return {
    loginHandler,
    requireAdmin,
    checkHandler(req: Request, res: Response) {
      if (!sessionFor(req)) {
        clearCookie(res);
        return res.status(401).json({ authenticated: false });
      }
      return res.json({ authenticated: true });
    },
    logoutHandler(req: Request, res: Response) {
      revoke(req);
      clearCookie(res);
      return res.json({ success: true });
    },
  };
}

let defaultService: ReturnType<typeof createAuthService> | undefined;
export function initializeAuth(options = validateAuthConfiguration()) {
  defaultService = createAuthService(options);
  return defaultService;
}
function service() {
  if (!defaultService) throw new Error("Authentication was not initialized");
  return defaultService;
}
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => service().requireAdmin(req, res, next);
export const authLogin = (req: Request, res: Response) => service().loginHandler(req, res);
export const authCheck = (req: Request, res: Response) => service().checkHandler(req, res);
export const authLogout = (req: Request, res: Response) => service().logoutHandler(req, res);
