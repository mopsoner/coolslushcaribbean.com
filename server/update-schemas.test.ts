import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingStatusUpdateSchema,
  updateBookingSchema,
  updateMachineSchema,
  updateOfferMachinePriceSchema,
  updateOfferWithPricingSchema,
  updateSyrupSchema,
} from "@shared/schema";

test("update prices cannot be negative", () => {
  assert.equal(updateSyrupSchema.safeParse({ amountCents: -1 }).success, false);
  assert.equal(updateOfferMachinePriceSchema.safeParse({ amountCents: -1 }).success, false);
  assert.equal(updateOfferWithPricingSchema.safeParse({ basePriceCents: -1 }).success, false);
  assert.equal(updateOfferWithPricingSchema.safeParse({
    machinePriceOverrides: [{ machineId: "machine-1", amountCents: -1 }],
  }).success, false);
});

test("update statuses only accept known enum values", () => {
  assert.equal(updateMachineSchema.safeParse({ status: "BROKEN" }).success, false);
  assert.equal(bookingStatusUpdateSchema.safeParse({ status: "UNKNOWN" }).success, false);
});

test("update schemas reject injected identifiers and immutable foreign keys", () => {
  assert.equal(updateMachineSchema.safeParse({ id: "injected" }).success, false);
  assert.equal(updateBookingSchema.safeParse({ id: "injected" }).success, false);
  assert.equal(updateSyrupSchema.safeParse({ id: "injected" }).success, false);
  assert.equal(updateOfferMachinePriceSchema.safeParse({ offerId: "injected" }).success, false);
  assert.equal(updateOfferMachinePriceSchema.safeParse({ machineId: "injected" }).success, false);
});

test("booking updates reject invalid dates", () => {
  assert.equal(updateBookingSchema.safeParse({ startDate: "not-a-date" }).success, false);
  assert.equal(updateBookingSchema.safeParse({ endDate: "2026-99-99" }).success, false);
});

test("update schemas reject surplus properties and empty objects", () => {
  assert.equal(updateMachineSchema.safeParse({ name: "Machine", surplus: true }).success, false);
  assert.equal(updateOfferWithPricingSchema.safeParse({ active: true, surplus: true }).success, false);
  assert.equal(bookingStatusUpdateSchema.safeParse({ status: "PENDING", surplus: true }).success, false);

  for (const schema of [
    updateMachineSchema,
    updateBookingSchema,
    updateOfferWithPricingSchema,
    updateOfferMachinePriceSchema,
    updateSyrupSchema,
  ]) {
    assert.equal(schema.safeParse({}).success, false);
  }
});
