import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const machines = pgTable("machines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().default("EZBASICS Slushy Machine"),
  status: text("status").notNull().default("AVAILABLE"), // AVAILABLE, UNAVAILABLE, MAINTENANCE
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offer: text("offer").notNull(), // "1 Journée", "Week-end", "Événement"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  startHour: integer("start_hour").notNull(), // 0-23
  endHour: integer("end_hour").notNull(), // 1-24
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerAddress: text("customer_address"),
  machines: integer("machines").notNull().default(1),
  totalCents: integer("total_cents").notNull().default(0),
  status: text("status").notNull().default("PENDING"), // PENDING, CONFIRMED, CANCELLED
  swiklyUrl: text("swikly_url"),
  stripePaymentId: text("stripe_payment_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMachineSchema = createInsertSchema(machines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  machines: true, // Omit to redefine with strict validation
}).extend({
  startDate: z.union([
    z.date(), 
    z.string().min(1, "Date de début requise").transform((val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error("Date de début invalide");
      }
      return date;
    })
  ]),
  endDate: z.union([
    z.date(), 
    z.string().min(1, "Date de fin requise").transform((val) => {
      const date = new Date(val);
      if (isNaN(date.getTime())) {
        throw new Error("Date de fin invalide");
      }
      return date;
    })
  ]),
  customerAddress: z.string().min(5, "Adresse requise (min. 5 caractères)"),
  machines: z.number().int().min(1, "Au moins 1 machine requise").max(10, "Maximum 10 machines"),
}).refine((data) => {
  // Pour les offres multi-jours, s'assurer que endDate >= startDate
  const start = data.startDate instanceof Date ? data.startDate : new Date(data.startDate);
  const end = data.endDate instanceof Date ? data.endDate : new Date(data.endDate);
  return end >= start;
}, {
  message: "La date de fin doit être après ou égale à la date de début",
  path: ["endDate"],
});

export type InsertMachine = z.infer<typeof insertMachineSchema>;
export type Machine = typeof machines.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
