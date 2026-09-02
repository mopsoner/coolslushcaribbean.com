import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import type { Booking, BookingStatus } from "@shared/schema";
import { login, requireAdmin } from "./auth-middleware";
import { registerAdminBookingStatusRoute } from "./admin-booking-status";
import {
  assertBookingStatusTransition,
  BookingTransitionError,
  transitionBookingStatus,
  type BookingStatusStore,
} from "./booking-status";

function booking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: "booking-1", offer: "Journée", startDate: new Date(), endDate: new Date(),
    startHour: 9, endHour: 18, customerName: "Client", customerPhone: "phone",
    customerEmail: "client@example.com", customerAddress: "address", accessTokenHash: "hash",
    machines: 1, bookedMachines: [], selectedSyrups: [], cupSize: "moyen", totalCents: 10000,
    status: "PENDING", paymentStatus: "PENDING", depositStatus: "PENDING",
    stripePaymentIntentId: null, swiklyRequestId: null, swiklyUrl: null,
    swiklyReturnToken: null, swiklyReturnTokenCreatedAt: null, stripePaymentId: null,
    createdAt: new Date(), updatedAt: new Date(), ...overrides,
  };
}

async function withStatusServer(
  store: BookingStatusStore,
  run: (origin: string) => Promise<void>,
) {
  const app = express();
  app.use(express.json());
  registerAdminBookingStatusRoute(app, store, requireAdmin);
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  assert(address && typeof address === "object");
  try { await run(`http://127.0.0.1:${address.port}`); } finally { server.close(); }
}

test("status endpoint rejects a request without an admin token", () => {
  const store: BookingStatusStore = {
    getBooking: async () => { throw new Error("must not be called"); },
    updateBookingStatus: async () => { throw new Error("must not be called"); },
  };
  return withStatusServer(store, async origin => {
    const response = await fetch(`${origin}/api/admin/bookings/booking-1/status`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "CONFIRMED" }),
    });
    assert.equal(response.status, 401);
  });
});

test("status endpoint validates an unknown status before storage access", () => {
  const store: BookingStatusStore = {
    getBooking: async () => { throw new Error("must not be called"); },
    updateBookingStatus: async () => { throw new Error("must not be called"); },
  };
  const token = login(process.env.ADMIN_PASSWORD || "admin123");
  assert(token);
  return withStatusServer(store, async origin => {
    const response = await fetch(`${origin}/api/admin/bookings/booking-1/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: "UNKNOWN" }),
    });
    assert.equal(response.status, 400);
  });
});

test("paid and secured pending bookings can be confirmed", () => {
  assert.doesNotThrow(() => assertBookingStatusTransition(
    booking({ paymentStatus: "COMPLETED", depositStatus: "COMPLETED" }),
    { status: "CONFIRMED", override: false, actor: "admin" },
  ));
});

test("unpaid or unsecured bookings cannot be confirmed implicitly", () => {
  assert.throws(() => assertBookingStatusTransition(
    booking({ paymentStatus: "COMPLETED", depositStatus: "PENDING" }),
    { status: "CONFIRMED", override: false, actor: "admin" },
  ), BookingTransitionError);
});

test("an explicit confirmation override is audited", async () => {
  const original = booking();
  const audits: Record<string, unknown>[] = [];
  const store: BookingStatusStore = {
    getBooking: async () => original,
    updateBookingStatus: async (_id: string, status: BookingStatus) => ({ ...original, status }),
  };
  const updated = await transitionBookingStatus(store, original, {
    status: "CONFIRMED", override: true,
    overrideReason: "Dérogation validée par la direction", actor: "admin",
  }, entry => audits.push(entry));
  assert.equal(updated?.status, "CONFIRMED");
  assert.equal(audits.length, 1);
  assert.equal(audits[0].action, "BOOKING_STATUS_OVERRIDE");
});

test("cancelled bookings cannot be reopened", () => {
  assert.throws(() => assertBookingStatusTransition(
    booking({ status: "CANCELLED" }),
    { status: "PENDING", override: false, actor: "admin" },
  ), BookingTransitionError);
});
