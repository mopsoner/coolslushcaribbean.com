import assert from "node:assert/strict";
import test from "node:test";
import type { Machine, Offer, Syrup } from "@shared/schema";
import { BookingPricingError, calculateBookingQuote } from "./booking-pricing";

const offer = { id: "offer", name: "Journée", active: true } as Offer;
const machine = (id: string, name: string) => ({
  id,
  name,
  model: `model-${id}`,
  capacity: "2 L",
  programs: ["Slush"],
  features: ["Frozen"],
  includedServices: ["Livraison"],
  imageUrl: `/machines/${id}.webp`,
} as Machine);
const syrup = (id: string, active = true, amountCents = 250) => ({
  id,
  name: `Sirop ${id}`,
  active,
  amountCents,
} as Syrup);

test("prices every machine in a mixed reservation independently", () => {
  const result = calculateBookingQuote({
    offer,
    rentalDays: 3,
    machines: [
      { request: { machineId: "a", quantity: 2 }, machine: machine("a", "Machine A"), amountCents: 1_000 },
      { request: { machineId: "b", quantity: 1 }, machine: machine("b", "Machine B"), amountCents: 1_500 },
    ],
    syrups: [{ request: { syrupId: "mangue", quantity: 2 }, syrup: syrup("mangue") }],
  });

  assert.equal(result.machineTotalCents, 10_500);
  assert.equal(result.totalCents, 11_000);
  assert.equal(result.bookedMachines[0].machineName, "Machine A");
  assert.equal(result.bookedMachines[0].model, "model-a");
});

test("preserves a machine-specific override of zero", () => {
  const result = calculateBookingQuote({
    offer,
    rentalDays: 2,
    machines: [{ request: { machineId: "free", quantity: 3 }, machine: machine("free", "Gratuite"), amountCents: 0 }],
    syrups: [],
  });

  assert.equal(result.totalCents, 0);
});

test("rejects an inactive offer", () => {
  assert.throws(() => calculateBookingQuote({
    offer: { ...offer, active: false },
    rentalDays: 1,
    machines: [],
    syrups: [],
  }), (error) => error instanceof BookingPricingError && error.message === "Offre invalide ou inactive");
});

test("rejects an inactive syrup instead of silently omitting it", () => {
  assert.throws(() => calculateBookingQuote({
    offer,
    rentalDays: 1,
    machines: [],
    syrups: [{ request: { syrupId: "ancien", quantity: 1 }, syrup: syrup("ancien", false) }],
  }), (error) => error instanceof BookingPricingError && error.message === "Sirop inactif : Sirop ancien");
});

test("rejects an unknown syrup instead of silently omitting it", () => {
  assert.throws(() => calculateBookingQuote({
    offer,
    rentalDays: 1,
    machines: [],
    syrups: [{ request: { syrupId: "missing", quantity: 1 }, syrup: undefined }],
  }), (error) => error instanceof BookingPricingError && error.message === "Sirop inconnu : missing");
});
