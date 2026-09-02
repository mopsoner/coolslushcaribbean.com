import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import type { Booking } from "@shared/schema";
import { getPublicAppUrl } from "./config";

process.env.PUBLIC_APP_URL = "https://reservations.example.com/application/path";
process.env.STRIPE_SECRET_KEY ||= "sk_test_placeholder";

test("public app URL configuration is required and parsed as an HTTP(S) URL", () => {
  assert.throws(() => getPublicAppUrl({}), /PUBLIC_APP_URL/);
  assert.throws(() => getPublicAppUrl({ PUBLIC_APP_URL: "not a URL" }), /Invalid URL/);
  assert.throws(
    () => getPublicAppUrl({ PUBLIC_APP_URL: "javascript:alert(1)" }),
    /http or https/,
  );
  assert.equal(
    getPublicAppUrl({ PUBLIC_APP_URL: "https://reservations.example.com" }).origin,
    "https://reservations.example.com",
  );
});

test("Replit domains provide a public URL when PUBLIC_APP_URL is not set", () => {
  assert.equal(
    getPublicAppUrl({ REPLIT_DOMAINS: "booking.example.replit.app, legacy.example.repl.co" }).origin,
    "https://booking.example.replit.app",
  );
  assert.equal(
    getPublicAppUrl({ REPLIT_DEV_DOMAIN: "booking-dev.example.repl.co" }).origin,
    "https://booking-dev.example.repl.co",
  );
});

test("PUBLIC_APP_URL takes priority over Replit-provided domains", () => {
  assert.equal(
    getPublicAppUrl({
      PUBLIC_APP_URL: "https://coolslushcaribbean.com",
      REPLIT_DOMAINS: "booking.example.replit.app",
    }).origin,
    "https://coolslushcaribbean.com",
  );
});

test("a forged Host header cannot change the URL sent to Swikly", async () => {
  const { createSwiklyDeposit } = await import("./swikly-deposit");
  let callbackBaseUrl: string | undefined;
  const fakeSwikly = {
    async createDeposit(_booking: Booking, baseUrl?: string) {
      callbackBaseUrl = baseUrl;
      return { request: { id: "request-1", link: "https://swik.link/request-1" } };
    },
  };
  const app = express();
  app.post("/confirm", async (_req, res) => {
    await createSwiklyDeposit(fakeSwikly, { id: "booking-1" } as Booking, "return-token");
    res.sendStatus(204);
  });
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));

  try {
    const address = server.address();
    assert(address && typeof address === "object");
    const response = await fetch(`http://127.0.0.1:${address.port}/confirm`, {
      method: "POST",
      headers: {
        host: "attacker.example",
        "x-forwarded-host": "proxy-attacker.example",
        "x-forwarded-proto": "http",
      },
    });

    assert.equal(response.status, 204);
    assert.equal(callbackBaseUrl, "https://reservations.example.com");
  } finally {
    server.close();
  }
});
