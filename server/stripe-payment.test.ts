import assert from "node:assert/strict";
import test from "node:test";
import { StripePaymentValidationError, validateStripePayment } from "./stripe-payment";

const booking = { id: "booking-1", totalCents: 12_500 };
const intent = {
  id: "pi_test_controlled",
  status: "succeeded",
  amount: 12_500,
  currency: "eur",
  metadata: { bookingId: booking.id },
};

test("accepts a successful Stripe intent belonging to the booking", () => {
  assert.doesNotThrow(() => validateStripePayment(booking, intent));
});

for (const [label, override] of [
  ["unsuccessful status", { status: "requires_payment_method" }],
  ["different booking", { metadata: { bookingId: "booking-other" } }],
  ["different amount", { amount: 12_499 }],
  ["different currency", { currency: "usd" }],
] as const) {
  test(`rejects an intent with ${label}`, () => {
    assert.throws(
      () => validateStripePayment(booking, { ...intent, ...override }),
      StripePaymentValidationError,
    );
  });
}
