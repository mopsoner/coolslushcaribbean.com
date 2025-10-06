import { type Machine, type InsertMachine, type Booking, type InsertBooking, machines, bookings } from "@shared/schema";
import { db } from "../db";
import { eq, gte, lte, and } from "drizzle-orm";

export interface IStorage {
  // Machine methods
  getMachine(id: string): Promise<Machine | undefined>;
  getAllMachines(): Promise<Machine[]>;
  getAvailableMachines(): Promise<Machine[]>;
  createMachine(machine: InsertMachine): Promise<Machine>;
  updateMachineStatus(id: string, status: string): Promise<Machine | undefined>;

  // Booking methods
  getBooking(id: string): Promise<Booking | undefined>;
  getAllBookings(): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | undefined>;
  updateBookingStatus(id: string, status: string): Promise<Booking | undefined>;
  getBookingsByDate(date: Date): Promise<Booking[]>;
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

  async updateMachineStatus(id: string, status: string): Promise<Machine | undefined> {
    const result = await db
      .update(machines)
      .set({ status, updatedAt: new Date() })
      .where(eq(machines.id, id))
      .returning();
    return result[0];
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
      .where(and(gte(bookings.date, startOfDay), lte(bookings.date, endOfDay)));
  }
}

export const storage = new DbStorage();
