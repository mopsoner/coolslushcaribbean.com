import type { Machine, Offer, Syrup } from "@shared/schema";

export type RequestedMachine = { machineId: string; quantity: number };
export type RequestedSyrup = { syrupId: string; quantity: number };

export type MachineQuoteInput = {
  request: RequestedMachine;
  machine?: Machine;
  amountCents: number | null;
};

export type SyrupQuoteInput = {
  request: RequestedSyrup;
  syrup?: Syrup;
};

export class BookingPricingError extends Error {
  readonly statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "BookingPricingError";
  }
}

/**
 * Validates resolved catalogue data, creates the immutable machine snapshot and
 * calculates a quote without performing I/O.
 */
export function calculateBookingQuote(input: {
  offer: Offer;
  rentalDays: number;
  machines: MachineQuoteInput[];
  syrups: SyrupQuoteInput[];
}) {
  if (!input.offer.active) {
    throw new BookingPricingError("Offre invalide ou inactive");
  }

  let machineTotalCents = 0;
  const bookedMachines = input.machines.map(({ request, machine, amountCents }) => {
    if (!machine) {
      throw new BookingPricingError(`Machine inconnue : ${request.machineId}`);
    }
    if (amountCents === null) {
      throw new BookingPricingError(`Prix non configuré pour la machine "${machine.name}"`);
    }

    machineTotalCents += amountCents * request.quantity * input.rentalDays;
    return {
      machineId: machine.id,
      machineName: machine.name,
      quantity: request.quantity,
      model: machine.model,
      capacity: machine.capacity,
      programs: machine.programs,
      features: machine.features,
      includedServices: machine.includedServices,
      imageUrl: machine.imageUrl,
    };
  });

  let syrupTotalCents = 0;
  for (const { request, syrup } of input.syrups) {
    if (!syrup) {
      throw new BookingPricingError(`Sirop inconnu : ${request.syrupId}`);
    }
    if (!syrup.active) {
      throw new BookingPricingError(`Sirop inactif : ${syrup.name}`);
    }
    syrupTotalCents += syrup.amountCents * request.quantity;
  }

  return {
    bookedMachines,
    machineTotalCents,
    syrupTotalCents,
    totalCents: machineTotalCents + syrupTotalCents,
  };
}
