import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import express from "express";
import type { Booking } from "@shared/schema";
import { registerSwiklyWebhookRoute, type SwiklyWebhookStore } from "./swikly-webhook";

const secret = "test-webhook-secret";

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-1", offer: "Journée", startDate: new Date(), endDate: new Date(),
    startHour: 9, endHour: 18, customerName: "Client", customerPhone: "phone",
    customerEmail: "client@example.com", customerAddress: null, accessTokenHash: "hash",
    machines: 1, bookedMachines: [], selectedSyrups: [], cupSize: "moyen", totalCents: 10000,
    status: "PENDING", paymentStatus: "COMPLETED", depositStatus: "PENDING",
    stripePaymentIntentId: null, swiklyRequestId: "request-1", swiklyUrl: null,
    lastSwiklyEventId: null, swiklyReturnToken: null, swiklyReturnTokenCreatedAt: null,
    stripePaymentId: null, createdAt: new Date(), updatedAt: new Date(), ...overrides,
  };
}

async function withServer(run: (origin: string, store: SwiklyWebhookStore & { writes: number }) => Promise<void>) {
  let current = booking();
  const store = {
    writes: 0,
    getBooking: async (id: string) => id === current.id ? current : undefined,
    applySwiklyEvent: async (id: string, requestId: string, eventId: string) => {
      if (id !== current.id || requestId !== current.swiklyRequestId || current.lastSwiklyEventId === eventId) return undefined;
      store.writes++;
      current = { ...current, depositStatus: "COMPLETED", status: "CONFIRMED", lastSwiklyEventId: eventId };
      return current;
    },
  };
  const app = express();
  app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
  registerSwiklyWebhookRoute(app, store);
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  assert(address && typeof address === "object");
  try { await run(`http://127.0.0.1:${address.port}`, store); } finally { server.close(); }
}

function signedRequest(origin: string, payload: object, options: { signature?: string; timestamp?: string } = {}) {
  const body = JSON.stringify(payload);
  const timestamp = options.timestamp ?? String(Math.floor(Date.now() / 1000));
  const signature = options.signature ?? createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return fetch(`${origin}/api/swikly-callback`, {
    method: "POST",
    headers: { "content-type": "application/json", "swikly-timestamp": timestamp, "swikly-signature": signature },
    body,
  });
}

const payload = { eventId: "event-1", customId: "booking-1", requestId: "request-1", status: "completed" };

test("Swikly callback authenticates before business reads and handles valid signatures", { concurrency: false }, async () => {
  process.env.SWIKLY_WEBHOOK_SECRET = secret;
  await withServer(async (origin, store) => {
    const valid = await signedRequest(origin, payload);
    assert.equal(valid.status, 200);
    assert.equal(store.writes, 1);
  });
});

test("Swikly callback rejects missing, incorrect and stale signatures without storage writes", { concurrency: false }, async () => {
  process.env.SWIKLY_WEBHOOK_SECRET = secret;
  await withServer(async (origin, store) => {
    const missing = await fetch(`${origin}/api/swikly-callback`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    assert.equal(missing.status, 401);
    assert.equal((await signedRequest(origin, payload, { signature: "0".repeat(64) })).status, 401);
    assert.equal((await signedRequest(origin, payload, { timestamp: "1" })).status, 401);
    assert.equal(store.writes, 0);
  });
});

test("Swikly callback is idempotent for event replays", { concurrency: false }, async () => {
  process.env.SWIKLY_WEBHOOK_SECRET = secret;
  await withServer(async (origin, store) => {
    assert.equal((await signedRequest(origin, payload)).status, 200);
    const replay = await signedRequest(origin, payload);
    assert.equal(replay.status, 200);
    assert.equal((await replay.json()).replay, true);
    assert.equal(store.writes, 1);
  });
});

test("Swikly callback rejects a request identifier belonging to another deposit", { concurrency: false }, async () => {
  process.env.SWIKLY_WEBHOOK_SECRET = secret;
  await withServer(async (origin, store) => {
    const response = await signedRequest(origin, { ...payload, requestId: "request-other" });
    assert.equal(response.status, 409);
    assert.equal(store.writes, 0);
  });
});
