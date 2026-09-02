import { createHmac, timingSafeEqual } from "crypto";
import type { Express, Request } from "express";
import type { Booking } from "@shared/schema";

const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

export interface SwiklyWebhookStore {
  getBooking(id: string): Promise<Booking | undefined>;
  applySwiklyEvent(id: string, swiklyRequestId: string, eventId: string): Promise<Booking | undefined>;
}

function header(req: Request, name: string): string | undefined {
  const value = req.header(name);
  return value?.trim() || undefined;
}

export function verifySwiklySignature(req: Request, secret: string | undefined, now = Date.now()): boolean {
  const signature = header(req, "swikly-signature") ?? header(req, "x-swikly-signature");
  const timestamp = header(req, "swikly-timestamp") ?? header(req, "x-swikly-timestamp");
  if (!secret || !signature || !timestamp || !Buffer.isBuffer(req.rawBody)) return false;

  const seconds = Number(timestamp);
  if (!Number.isInteger(seconds) || Math.abs(Math.floor(now / 1000) - seconds) > MAX_CLOCK_SKEW_SECONDS) return false;

  const suppliedHex = signature.startsWith("sha256=") ? signature.slice(7) : signature;
  if (!/^[a-f\d]{64}$/i.test(suppliedHex)) return false;
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.`)
    .update(req.rawBody)
    .digest();
  const supplied = Buffer.from(suppliedHex, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function registerSwiklyWebhookRoute(app: Express, store: SwiklyWebhookStore) {
  app.post("/api/swikly-callback", async (req, res) => {
    // Authentication deliberately precedes payload inspection and all storage access.
    if (!verifySwiklySignature(req, process.env.SWIKLY_WEBHOOK_SECRET)) {
      return res.status(401).json({ error: "Invalid Swikly webhook signature" });
    }

    const eventId = req.body?.eventId ?? req.body?.id;
    const bookingId = req.body?.customId ?? req.body?.request?.customId;
    const swiklyRequestId = req.body?.requestId ?? req.body?.swiklyRequestId ?? req.body?.request?.id;
    const status = String(req.body?.status ?? req.body?.request?.deposit?.status ?? "").toLowerCase();
    if (!eventId || !bookingId || !swiklyRequestId) {
      return res.status(400).json({ error: "Invalid Swikly webhook payload" });
    }

    const booking = await store.getBooking(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (!booking.swiklyRequestId || booking.swiklyRequestId !== swiklyRequestId) {
      return res.status(409).json({ error: "Swikly request does not match booking" });
    }
    if (booking.lastSwiklyEventId === eventId) return res.json({ success: true, replay: true });
    if (!["completed", "accepted", "validated"].includes(status)) return res.json({ success: true, ignored: true });

    const updated = await store.applySwiklyEvent(bookingId, swiklyRequestId, eventId);
    // A concurrent delivery may have won the conditional atomic update.
    return res.json({ success: true, replay: !updated });
  });
}
