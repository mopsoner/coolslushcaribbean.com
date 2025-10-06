import { type Machine, type InsertMachine, type Booking, type InsertBooking } from "@shared/schema";
import { randomUUID } from "crypto";

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

export class MemStorage implements IStorage {
  private machines: Map<string, Machine>;
  private bookings: Map<string, Booking>;

  constructor() {
    this.machines = new Map();
    this.bookings = new Map();
    
    // Initialize with some demo machines
    this.initializeMachines();
  }

  private initializeMachines() {
    const machine1: Machine = {
      id: "machine-1",
      name: "EZBASICS Slushy Machine #1",
      status: "AVAILABLE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const machine2: Machine = {
      id: "machine-2", 
      name: "EZBASICS Slushy Machine #2",
      status: "UNAVAILABLE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const machine3: Machine = {
      id: "machine-3",
      name: "EZBASICS Slushy Machine #3", 
      status: "MAINTENANCE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.machines.set(machine1.id, machine1);
    this.machines.set(machine2.id, machine2);
    this.machines.set(machine3.id, machine3);
  }

  async getMachine(id: string): Promise<Machine | undefined> {
    return this.machines.get(id);
  }

  async getAllMachines(): Promise<Machine[]> {
    return Array.from(this.machines.values());
  }

  async getAvailableMachines(): Promise<Machine[]> {
    return Array.from(this.machines.values()).filter(m => m.status === "AVAILABLE");
  }

  async createMachine(insertMachine: InsertMachine): Promise<Machine> {
    const id = randomUUID();
    const machine: Machine = {
      ...insertMachine,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.machines.set(id, machine);
    return machine;
  }

  async updateMachineStatus(id: string, status: string): Promise<Machine | undefined> {
    const machine = this.machines.get(id);
    if (!machine) return undefined;
    
    const updated = { ...machine, status, updatedAt: new Date() };
    this.machines.set(id, updated);
    return updated;
  }

  async getBooking(id: string): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getAllBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values());
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    const booking: Booking = {
      ...insertBooking,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.bookings.set(id, booking);
    return booking;
  }

  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    
    const updated = { ...booking, ...updates, updatedAt: new Date() };
    this.bookings.set(id, updated);
    return updated;
  }

  async updateBookingStatus(id: string, status: string): Promise<Booking | undefined> {
    return this.updateBooking(id, { status });
  }

  async getBookingsByDate(date: Date): Promise<Booking[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return Array.from(this.bookings.values()).filter(booking => {
      const bookingDate = new Date(booking.date);
      return bookingDate >= startOfDay && bookingDate <= endOfDay;
    });
  }
}

export const storage = new MemStorage();
