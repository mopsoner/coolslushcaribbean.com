import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import type { Booking } from "@shared/schema";
import { hashAccessToken, registerBookingReadRoutes } from "./booking-access";
import { initializeAuth } from "./auth-middleware";

initializeAuth({
  password: "correct horse battery staple",
  sessionSecret: "a-session-secret-that-is-at-least-32-bytes",
});

const accessToken = "owner-secret-token";
const booking: Booking = {
  id: "booking-1", offer: "Journée", startDate: new Date(), endDate: new Date(),
  startHour: 9, endHour: 18, customerName: "Client", customerPhone: "secret-phone",
  customerEmail: "client@example.com", customerAddress: "secret-address", machines: 1,
  bookedMachines: [{ machineId: "internal-machine-id", machineName: "Slushi", quantity: 1 }],
  selectedSyrups: [{ syrupId: "internal-syrup-id", quantity: 1 }], cupSize: "moyen",
  totalCents: 10000, status: "PENDING", paymentStatus: "PENDING", depositStatus: "PENDING",
  accessTokenHash: hashAccessToken(accessToken), stripePaymentIntentId: "pi_secret",
  swiklyRequestId: "swikly-secret", swiklyUrl: "https://secret.invalid",
  lastSwiklyEventId: null,
  swiklyReturnToken: "return-secret", swiklyReturnTokenCreatedAt: new Date(),
  stripePaymentId: "stripe-secret", createdAt: new Date(), updatedAt: new Date(),
};

async function withServer(run: (origin: string) => Promise<void>) {
  const app = express();
  registerBookingReadRoutes(app, {
    getAllBookings: async () => [booking],
    getBooking: async id => id === booking.id ? booking : undefined,
  });
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  const address = server.address();
  assert(address && typeof address === "object");
  try { await run(`http://127.0.0.1:${address.port}`); } finally { server.close(); }
}

test("a visitor cannot list bookings", () => withServer(async origin => {
  assert.equal((await fetch(`${origin}/api/bookings`)).status, 404);
  assert.equal((await fetch(`${origin}/api/admin/bookings`)).status, 401);
}));

test("a visitor cannot read a booking without its token", () => withServer(async origin => {
  assert.equal((await fetch(`${origin}/api/bookings/${booking.id}`)).status, 403);
  assert.equal((await fetch(`${origin}/api/bookings/${booking.id}?token=wrong`)).status, 403);
}));

test("an owner receives only the public booking DTO", () => withServer(async origin => {
  const response = await fetch(`${origin}/api/bookings/${booking.id}?token=${accessToken}`);
  assert.equal(response.status, 200);
  const body = await response.json();
  for (const privateField of ["customerAddress", "customerPhone", "accessTokenHash",
    "stripePaymentIntentId", "stripePaymentId", "swiklyRequestId", "swiklyUrl",
    "swiklyReturnToken", "selectedSyrups"]) {
    assert.equal(privateField in body, false, `${privateField} must remain private`);
  }
  assert.deepEqual(body.bookedMachines, [{ machineName: "Slushi", quantity: 1 }]);
}));
