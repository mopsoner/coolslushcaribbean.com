import type { Booking } from "@shared/schema";

export type StripePaymentIntent = {
  id: string;
  status: string;
  amount: number;
  currency: string;
  metadata: Record<string, string>;
};

export class StripePaymentValidationError extends Error {
  readonly statusCode = 400;
}

/** Pure validation of the Stripe facts required before a booking is mutated. */
export function validateStripePayment(
  booking: Pick<Booking, "id" | "totalCents">,
  intent: StripePaymentIntent,
): void {
  if (intent.status !== "succeeded") {
    throw new StripePaymentValidationError(`Le paiement n'a pas abouti (statut: ${intent.status})`);
  }
  if (intent.metadata.bookingId !== booking.id) {
    throw new StripePaymentValidationError("Le paiement ne correspond pas à cette réservation");
  }
  if (intent.amount !== booking.totalCents) {
    throw new StripePaymentValidationError("Le montant du paiement ne correspond pas au total de la réservation");
  }
  if (intent.currency.toLowerCase() !== "eur") {
    throw new StripePaymentValidationError("La devise du paiement n'est pas correcte");
  }
}
