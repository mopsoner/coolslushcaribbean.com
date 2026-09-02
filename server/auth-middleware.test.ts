import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createAuthService, validateAuthConfiguration } from "./auth-middleware";

const password = "correct horse battery staple";
const sessionSecret = "test-session-secret-with-more-than-32-characters";

async function withAuthServer(
  options: Parameters<typeof createAuthService>[0],
  run: (origin: string) => Promise<void>,
) {
  const auth = createAuthService(options);
  const app = express();
  app.use(express.json());
  app.post("/api/auth/login", auth.loginHandler);
  app.post("/api/auth/logout", auth.logoutHandler);
  app.get("/api/auth/check", auth.checkHandler);
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  assert(address && typeof address === "object");
  try { await run(`http://127.0.0.1:${address.port}`); } finally { server.close(); }
}

async function logIn(origin: string) {
  const response = await fetch(`${origin}/api/auth/login`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }),
  });
  assert.equal(response.status, 200);
  const setCookie = response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=Strict/i);
  return setCookie.split(";", 1)[0];
}

test("startup rejects missing and weak authentication secrets", () => {
  assert.throws(() => validateAuthConfiguration({}), /ADMIN_PASSWORD/);
  assert.throws(() => validateAuthConfiguration({ ADMIN_PASSWORD: "too-short" }), /ADMIN_PASSWORD/);
  assert.throws(() => validateAuthConfiguration({ ADMIN_PASSWORD: password, AUTH_SESSION_SECRET: "weak" }), /AUTH_SESSION_SECRET/);
});

test("login is rate limited per account after progressive delays", () => withAuthServer({
  password, sessionSecret, sleep: async () => {},
}, async origin => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(`${origin}/api/auth/login`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ account: "admin", password: "definitely-wrong" }),
    });
    assert.equal(response.status, 401);
  }
  const limited = await fetch(`${origin}/api/auth/login`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ account: "admin", password }),
  });
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("retry-after"), "60");
}));

test("sessions expire after inactivity and at their absolute deadline", () => {
  let time = 1_000;
  return withAuthServer({ password, sessionSecret, now: () => time, sleep: async () => {},
    idleTimeoutMs: 100, absoluteTimeoutMs: 250 }, async origin => {
    let cookie = await logIn(origin);
    time += 101;
    assert.equal((await fetch(`${origin}/api/auth/check`, { headers: { cookie } })).status, 401);
    cookie = await logIn(origin);
    time += 90;
    assert.equal((await fetch(`${origin}/api/auth/check`, { headers: { cookie } })).status, 200);
    time += 90;
    assert.equal((await fetch(`${origin}/api/auth/check`, { headers: { cookie } })).status, 200);
    time += 71;
    assert.equal((await fetch(`${origin}/api/auth/check`, { headers: { cookie } })).status, 401);
  });
});

test("logout revokes the server session", () => withAuthServer({ password, sessionSecret }, async origin => {
  const cookie = await logIn(origin);
  assert.equal((await fetch(`${origin}/api/auth/logout`, { method: "POST", headers: { cookie } })).status, 200);
  assert.equal((await fetch(`${origin}/api/auth/check`, { headers: { cookie } })).status, 401);
}));
