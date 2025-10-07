import { type Machine, type InsertMachine, type Booking, type InsertBooking, type Offer, type InsertOffer, type PriceConfiguration, type InsertPriceConfiguration, type Syrup, type InsertSyrup, machines, bookings, offers, priceConfigurations, syrups } from "@shared/schema";
import { db } from "../db";
import { eq, gte, lte, and, isNull } from "drizzle-orm";

export interface IStorage {
  // Machine methods
  getMachine(id: string): Promise<Machine | undefined>;
  getAllMachines(): Promise<Machine[]>;
  getAvailableMachines(): Promise<Machine[]>;
  createMachine(machine: InsertMachine): Promise<Machine>;
  updateMachine(id: string, updates: Partial<Machine>): Promise<Machine | undefined>;
  updateMachineStatus(id: string, status: string): Promise<Machine | undefined>;
  deleteMachine(id: string): Promise<void>;

  // Booking methods
  getBooking(id: string): Promise<Booking | undefined>;
  getAllBookings(): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | undefined>;
  updateBookingStatus(id: string, status: string): Promise<Booking | undefined>;
  getBookingsByDate(date: Date): Promise<Booking[]>;

  // Offer methods
  getOffer(id: string): Promise<Offer | undefined>;
  getOfferByName(name: string): Promise<Offer | undefined>;
  getAllOffers(): Promise<Offer[]>;
  getActiveOffers(): Promise<Offer[]>;
  createOffer(offer: InsertOffer): Promise<Offer>;
  updateOffer(id: string, updates: Partial<Offer>): Promise<Offer | undefined>;

  // Price configuration methods
  getPriceConfiguration(id: string): Promise<PriceConfiguration | undefined>;
  getAllPriceConfigurations(): Promise<PriceConfiguration[]>;
  getPriceConfigurationsByOffer(offerId: string): Promise<PriceConfiguration[]>;
  createPriceConfiguration(config: InsertPriceConfiguration): Promise<PriceConfiguration>;
  updatePriceConfiguration(id: string, updates: Partial<PriceConfiguration>): Promise<PriceConfiguration | undefined>;
  deletePriceConfiguration(id: string): Promise<void>;
  getEffectivePrice(offerId: string, machineId?: string): Promise<{ amountCents: number } | null>;

  // Syrup methods
  getSyrup(id: string): Promise<Syrup | undefined>;
  getAllSyrups(): Promise<Syrup[]>;
  getActiveSyrups(): Promise<Syrup[]>;
  createSyrup(syrup: InsertSyrup): Promise<Syrup>;
  updateSyrup(id: string, updates: Partial<Syrup>): Promise<Syrup | undefined>;
  deleteSyrup(id: string): Promise<void>;
}

export class DbStorage implements IStorage {
  async getMachine(id: string): Promise<Machine | undefined> {
    const result = await db.select().from(machines).where(eq(machines.id, id)).limit(1);
    return result[0];
  }

  async getAllMachines(): Promise<Machine[]> {
    return await db.select().from(machines);
  }

  async getAvailableMachines(): Promise<Machine[]> {
    return await db.select().from(machines).where(eq(machines.status, "AVAILABLE"));
  }

  async createMachine(insertMachine: InsertMachine): Promise<Machine> {
    const result = await db.insert(machines).values(insertMachine).returning();
    return result[0];
  }

  async updateMachine(id: string, updates: Partial<Machine>): Promise<Machine | undefined> {
    const result = await db
      .update(machines)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(machines.id, id))
      .returning();
    return result[0];
  }

  async updateMachineStatus(id: string, status: string): Promise<Machine | undefined> {
    return this.updateMachine(id, { status });
  }

  async deleteMachine(id: string): Promise<void> {
    await db.delete(machines).where(eq(machines.id, id));
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    const result = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    return result[0];
  }

  async getAllBookings(): Promise<Booking[]> {
    return await db.select().from(bookings);
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const result = await db.insert(bookings).values(insertBooking).returning();
    return result[0];
  }

  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | undefined> {
    const result = await db
      .update(bookings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return result[0];
  }

  async updateBookingStatus(id: string, status: string): Promise<Booking | undefined> {
    return this.updateBooking(id, { status });
  }

  async getBookingsByDate(date: Date): Promise<Booking[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return await db
      .select()
      .from(bookings)
      .where(and(gte(bookings.startDate, startOfDay), lte(bookings.startDate, endOfDay)));
  }

  async getOffer(id: string): Promise<Offer | undefined> {
    const result = await db.select().from(offers).where(eq(offers.id, id)).limit(1);
    return result[0];
  }

  async getOfferByName(name: string): Promise<Offer | undefined> {
    const result = await db.select().from(offers).where(eq(offers.name, name)).limit(1);
    return result[0];
  }

  async getAllOffers(): Promise<Offer[]> {
    return await db.select().from(offers);
  }

  async getActiveOffers(): Promise<Offer[]> {
    return await db.select().from(offers).where(eq(offers.active, true));
  }

  async createOffer(insertOffer: InsertOffer): Promise<Offer> {
    const result = await db.insert(offers).values(insertOffer).returning();
    return result[0];
  }

  async updateOffer(id: string, updates: Partial<Offer>): Promise<Offer | undefined> {
    const result = await db
      .update(offers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(offers.id, id))
      .returning();
    return result[0];
  }

  async getPriceConfiguration(id: string): Promise<PriceConfiguration | undefined> {
    const result = await db.select().from(priceConfigurations).where(eq(priceConfigurations.id, id)).limit(1);
    return result[0];
  }

  async getAllPriceConfigurations(): Promise<PriceConfiguration[]> {
    return await db.select().from(priceConfigurations);
  }

  async getPriceConfigurationsByOffer(offerId: string): Promise<PriceConfiguration[]> {
    return await db.select().from(priceConfigurations).where(eq(priceConfigurations.offerId, offerId));
  }

  async createPriceConfiguration(config: InsertPriceConfiguration): Promise<PriceConfiguration> {
    const result = await db.insert(priceConfigurations).values(config).returning();
    return result[0];
  }

  async updatePriceConfiguration(id: string, updates: Partial<PriceConfiguration>): Promise<PriceConfiguration | undefined> {
    const result = await db
      .update(priceConfigurations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(priceConfigurations.id, id))
      .returning();
    return result[0];
  }

  async deletePriceConfiguration(id: string): Promise<void> {
    await db.delete(priceConfigurations).where(eq(priceConfigurations.id, id));
  }

  async getEffectivePrice(offerId: string, machineId?: string): Promise<{ amountCents: number } | null> {
    // If machineId is provided, try to find machine-specific price first
    if (machineId) {
      const machinePrice = await db
        .select()
        .from(priceConfigurations)
        .where(and(eq(priceConfigurations.offerId, offerId), eq(priceConfigurations.machineId, machineId)))
        .limit(1);
      
      if (machinePrice[0]) {
        return { amountCents: machinePrice[0].amountCents };
      }
    }

    // Fall back to default price (where machineId is null)
    const defaultPrice = await db
      .select()
      .from(priceConfigurations)
      .where(and(eq(priceConfigurations.offerId, offerId), isNull(priceConfigurations.machineId)))
      .limit(1);

    if (defaultPrice[0]) {
      return { amountCents: defaultPrice[0].amountCents };
    }

    return null;
  }

  async getSyrup(id: string): Promise<Syrup | undefined> {
    const result = await db.select().from(syrups).where(eq(syrups.id, id)).limit(1);
    return result[0];
  }

  async getAllSyrups(): Promise<Syrup[]> {
    return await db.select().from(syrups);
  }

  async getActiveSyrups(): Promise<Syrup[]> {
    return await db.select().from(syrups).where(eq(syrups.active, true));
  }

  async createSyrup(insertSyrup: InsertSyrup): Promise<Syrup> {
    const result = await db.insert(syrups).values(insertSyrup).returning();
    return result[0];
  }

  async updateSyrup(id: string, updates: Partial<Syrup>): Promise<Syrup | undefined> {
    const result = await db
      .update(syrups)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(syrups.id, id))
      .returning();
    return result[0];
  }

  async deleteSyrup(id: string): Promise<void> {
    await db.delete(syrups).where(eq(syrups.id, id));
  }
}

export const storage = new DbStorage();
