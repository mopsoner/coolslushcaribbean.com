import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const machines = pgTable("machines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().default("EZBASICS Slushy Machine"),
  status: text("status").notNull().default("AVAILABLE"), // AVAILABLE, UNAVAILABLE, MAINTENANCE
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const priceConfigurations = pgTable("price_configurations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").notNull().references(() => offers.id, { onDelete: 'cascade' }),
  machineId: varchar("machine_id").references(() => machines.id, { onDelete: 'cascade' }), // null = default price for all machines
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("EUR"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const syrups = pgTable("syrups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  amountCents: integer("amount_cents").notNull().default(0), // Prix du sirop
  active: boolean("active").notNull().default(true),
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
  selectedSyrups: json("selected_syrups").default([]), // Array of { syrupId: string, quantity: number }
  cupSize: text("cup_size").default("moyen"), // "petit", "moyen", "grand"
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
}).extend({
  name: z.string().min(1, "Le nom de la machine est requis").default("EZBASICS Slushy Machine"),
  status: z.string().default("AVAILABLE"),
});

const syrupSelectionSchema = z.object({
  syrupId: z.string(),
  quantity: z.number().int().min(1).max(10),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  machines: true, // Omit to redefine with strict validation
  selectedSyrups: true,
  cupSize: true,
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
  selectedSyrups: z.array(syrupSelectionSchema).optional().default([]),
  cupSize: z.enum(["petit", "moyen", "grand"]).default("moyen"),
}).refine((data) => {
  // Pour les offres multi-jours, s'assurer que endDate >= startDate
  const start = data.startDate instanceof Date ? data.startDate : new Date(data.startDate);
  const end = data.endDate instanceof Date ? data.endDate : new Date(data.endDate);
  return end >= start;
}, {
  message: "La date de fin doit être après ou égale à la date de début",
  path: ["endDate"],
});

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPriceConfigurationSchema = createInsertSchema(priceConfigurations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  currency: z.string().default("EUR"),
});

export const insertSyrupSchema = createInsertSchema(syrups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertMachine = z.infer<typeof insertMachineSchema>;
export type Machine = typeof machines.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = typeof offers.$inferSelect;
export type InsertPriceConfiguration = z.infer<typeof insertPriceConfigurationSchema>;
export type PriceConfiguration = typeof priceConfigurations.$inferSelect;
export type InsertSyrup = z.infer<typeof insertSyrupSchema>;
export type Syrup = typeof syrups.$inferSelect;
export type SyrupSelection = z.infer<typeof syrupSelectionSchema>;
