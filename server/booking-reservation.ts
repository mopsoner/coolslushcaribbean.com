import type { Booking, InsertBooking, Machine } from "@shared/schema";

export type BookingToCreate = InsertBooking & { accessTokenHash: string };

export type ReservationLine = {
  bookingId: string;
  machineId: string;
  machineName: string;
  quantity: number;
  startAt: Date;
  endAt: Date;
};

export interface BookingReservationTransaction {
  lockMachines(machineIds: string[]): Promise<void>;
  getMachines(machineIds: string[]): Promise<Machine[]>;
  getReservedQuantities(machineIds: string[], startAt: Date, endAt: Date): Promise<Map<string, number>>;
  insertBooking(booking: BookingToCreate): Promise<Booking>;
  insertReservationLines(lines: ReservationLine[]): Promise<void>;
}

export class BookingAvailabilityError extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "BookingAvailabilityError";
  }
}

/** Builds a half-open rental period [startAt, endAt) from calendar dates and hours. */
export function getBookingPeriod(booking: Pick<BookingToCreate, "startDate" | "endDate" | "startHour" | "endHour">) {
  const startAt = new Date(booking.startDate);
  const endAt = new Date(booking.endDate);

  // Date-only values sent by the UI are UTC midnight. Resetting the time makes
  // the hour fields authoritative even if a caller supplied a timestamp.
  startAt.setUTCHours(booking.startHour, 0, 0, 0);
  endAt.setUTCHours(booking.endHour, 0, 0, 0); // Date handles endHour=24 as next midnight.

  if (endAt <= startAt) {
    throw new BookingAvailabilityError("La fin de la réservation doit être postérieure à son début");
  }
  return { startAt, endAt };
}

/**
 * Performs the complete inventory decision after the caller has opened a DB
 * transaction. Locks must be transaction-scoped and acquired in sorted order.
 */
export async function reserveBooking(
  tx: BookingReservationTransaction,
  booking: BookingToCreate,
): Promise<Booking> {
  const { startAt, endAt } = getBookingPeriod(booking);
  const machineIds = booking.bookedMachines.map((line) => line.machineId).sort();

  await tx.lockMachines(machineIds);

  // These reads intentionally happen only after all locks are held. A waiting
  // transaction therefore observes reservation lines committed by its rival.
  const availableMachines = await tx.getMachines(machineIds);
  const machinesById = new Map(availableMachines.map((machine) => [machine.id, machine]));
  const reserved = await tx.getReservedQuantities(machineIds, startAt, endAt);

  for (const requested of booking.bookedMachines) {
    const machine = machinesById.get(requested.machineId);
    if (!machine) {
      throw new BookingAvailabilityError(`Machine "${requested.machineName}" non trouvée`);
    }
    if (machine.status !== "AVAILABLE") {
      throw new BookingAvailabilityError(`Machine "${requested.machineName}" n'est pas disponible`);
    }

    const alreadyReserved = reserved.get(machine.id) ?? 0;
    const remaining = machine.quantity - alreadyReserved;
    if (requested.quantity > remaining) {
      throw new BookingAvailabilityError(
        `Quantité demandée (${requested.quantity}) dépasse la disponibilité restante (${remaining}/${machine.quantity}) pour "${requested.machineName}" pendant cette période`,
      );
    }
  }

  const created = await tx.insertBooking(booking);
  await tx.insertReservationLines(booking.bookedMachines.map((line) => ({
    bookingId: created.id,
    machineId: line.machineId,
    machineName: line.machineName,
    quantity: line.quantity,
    startAt,
    endAt,
  })));
  return created;
}
