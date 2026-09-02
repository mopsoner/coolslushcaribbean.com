import type { Booking, BookingStatus } from "@shared/schema";

export class BookingTransitionError extends Error {}

export interface BookingStatusStore {
  getBooking(id: string): Promise<Booking | undefined>;
  updateBookingStatus(id: string, status: BookingStatus): Promise<Booking | undefined>;
}

export interface BookingStatusTransition {
  status: BookingStatus;
  override: boolean;
  overrideReason?: string;
  actor: string;
}

const allowedTransitions: Record<BookingStatus, readonly BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CANCELLED"],
  CANCELLED: [],
};

export function assertBookingStatusTransition(
  booking: Booking,
  transition: BookingStatusTransition,
): void {
  if (booking.status === transition.status) return;

  const currentStatus = booking.status as BookingStatus;
  if (!allowedTransitions[currentStatus]?.includes(transition.status)) {
    throw new BookingTransitionError(
      `Transition de ${booking.status} vers ${transition.status} interdite`,
    );
  }

  if (transition.status === "CONFIRMED") {
    const requirementsMet = booking.paymentStatus === "COMPLETED"
      && booking.depositStatus === "COMPLETED";
    if (!requirementsMet && !(transition.override && transition.overrideReason)) {
      throw new BookingTransitionError(
        "La réservation ne peut être confirmée sans paiement et caution conformes",
      );
    }
  }
}

export async function transitionBookingStatus(
  store: BookingStatusStore,
  booking: Booking,
  transition: BookingStatusTransition,
  audit: (entry: Record<string, unknown>) => void = entry => console.info("[booking-status-audit]", entry),
): Promise<Booking | undefined> {
  assertBookingStatusTransition(booking, transition);
  const updated = await store.updateBookingStatus(booking.id, transition.status);

  if (updated && transition.override) {
    audit({
      action: "BOOKING_STATUS_OVERRIDE",
      bookingId: booking.id,
      actor: transition.actor,
      from: booking.status,
      to: transition.status,
      reason: transition.overrideReason,
      timestamp: new Date().toISOString(),
    });
  }
  return updated;
}
