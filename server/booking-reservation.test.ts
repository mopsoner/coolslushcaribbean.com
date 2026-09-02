import assert from "node:assert/strict";
import test from "node:test";
import type { Booking, Machine } from "@shared/schema";
import {
  BookingAvailabilityError,
  type BookingReservationTransaction,
  type BookingToCreate,
  type ReservationLine,
  reserveBooking,
} from "./booking-reservation";

class Lock {
  private tail = Promise.resolve();

  async acquire() {
    let release!: () => void;
    const previous = this.tail;
    this.tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    return release;
  }
}

class ConcurrentReservationDatabase {
  readonly bookings: Booking[] = [];
  readonly lines: ReservationLine[] = [];
  private readonly locks = new Map<string, Lock>();

  constructor(private readonly machine: Machine) {}

  async create(booking: BookingToCreate) {
    const releases: Array<() => void> = [];
    const tx: BookingReservationTransaction = {
      lockMachines: async (ids) => {
        for (const id of ids) {
          const lock = this.locks.get(id) ?? new Lock();
          this.locks.set(id, lock);
          releases.push(await lock.acquire());
        }
      },
      getMachines: async () => [this.machine],
      getReservedQuantities: async (ids, startAt, endAt) => {
        // Make an unlocked read/write race deterministic if locking regresses.
        await new Promise((resolve) => setTimeout(resolve, 10));
        const totals = new Map<string, number>();
        for (const line of this.lines) {
          if (ids.includes(line.machineId) && line.startAt < endAt && line.endAt > startAt) {
            totals.set(line.machineId, (totals.get(line.machineId) ?? 0) + line.quantity);
          }
        }
        return totals;
      },
      insertBooking: async (input) => {
        const created = { ...input, id: `booking-${this.bookings.length + 1}` } as Booking;
        this.bookings.push(created);
        return created;
      },
      insertReservationLines: async (lines) => { this.lines.push(...lines); },
    };

    try {
      return await reserveBooking(tx, booking);
    } finally {
      releases.reverse().forEach((release) => release());
    }
  }
}

const machine = {
  id: "last-slushi",
  name: "Dernière Slushi",
  status: "AVAILABLE",
  quantity: 1,
} as Machine;

const request = (email: string): BookingToCreate => ({
  offer: "1 Journée",
  startDate: new Date("2027-06-12T00:00:00.000Z"),
  endDate: new Date("2027-06-12T00:00:00.000Z"),
  startHour: 10,
  endHour: 18,
  customerName: "Client concurrent",
  customerPhone: "0690123456",
  customerEmail: email,
  customerAddress: "1 rue du Test",
  accessTokenHash: `hash-${email}`,
  machines: 1,
  bookedMachines: [{ machineId: machine.id, machineName: machine.name, quantity: 1 }],
  selectedSyrups: [],
  cupSize: "moyen",
  totalCents: 10000,
});

test("two simultaneous requests for the last unit create only one booking", async () => {
  const database = new ConcurrentReservationDatabase(machine);

  const results = await Promise.allSettled([
    database.create(request("one@example.com")),
    database.create(request("two@example.com")),
  ]);

  assert.equal(results.filter(({ status }) => status === "fulfilled").length, 1);
  const rejected = results.find(({ status }) => status === "rejected");
  assert.ok(rejected && rejected.status === "rejected");
  assert.ok(rejected.reason instanceof BookingAvailabilityError);
  assert.equal(database.bookings.length, 1);
  assert.equal(database.lines.length, 1);
});

test("half-open periods allow a new booking at the exact previous end hour", async () => {
  const database = new ConcurrentReservationDatabase(machine);
  await database.create(request("morning@example.com"));

  const afternoon = request("afternoon@example.com");
  afternoon.startHour = 18;
  afternoon.endHour = 20;

  await assert.doesNotReject(database.create(afternoon));
  assert.equal(database.bookings.length, 2);
});
