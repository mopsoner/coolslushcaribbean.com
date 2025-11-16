import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean, json, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const machines = pgTable("machines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().default("Ninja Slushi"),
  status: text("status").notNull().default("AVAILABLE"), // AVAILABLE, UNAVAILABLE, MAINTENANCE
  quantity: integer("quantity").notNull().default(1), // Quantité disponible de cette machine
  model: text("model"),
  capacity: text("capacity"),
  programs: json("programs").$type<string[]>(), // Array of program names
  features: json("features").$type<string[]>(), // Array of features
  includedServices: json("included_services").$type<string[]>(), // Array of services with icons
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const offers = pgTable("offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  basePriceCents: integer("base_price_cents").notNull(), // Prix par machine par jour (daily price per machine)
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const offerMachinePrices = pgTable("offer_machine_prices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  offerId: varchar("offer_id").notNull().references(() => offers.id, { onDelete: 'cascade' }),
  machineId: varchar("machine_id").notNull().references(() => machines.id, { onDelete: 'cascade' }), // Surcharge spécifique pour une machine
  amountCents: integer("amount_cents").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueOfferMachine: unique().on(table.offerId, table.machineId),
}));

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
  machines: integer("machines").notNull().default(1), // Legacy: nombre total de machines
  bookedMachines: json("booked_machines").$type<Array<{machineId: string, machineName: string, quantity: number}>>(), // Détail des machines réservées
  selectedSyrups: json("selected_syrups").default([]), // Array of { syrupId: string, quantity: number }
  cupSize: text("cup_size").default("moyen"), // "petit", "moyen", "grand"
  totalCents: integer("total_cents").notNull().default(0),
  status: text("status").notNull().default("PENDING"), // PENDING, CONFIRMED, CANCELLED
  paymentStatus: text("payment_status").notNull().default("PENDING"), // PENDING, COMPLETED, FAILED
  depositStatus: text("deposit_status").notNull().default("PENDING"), // PENDING, COMPLETED, FAILED
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  swiklyRequestId: text("swikly_request_id"),
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
  name: z.string().min(1, "Le nom de la machine est requis").default("Ninja Slushi"),
  quantity: z.number().int().min(1).default(1),
  model: z.string().optional(),
  capacity: z.string().optional(),
  programs: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  includedServices: z.array(z.string()).optional(),
  status: z.string().default("AVAILABLE"),
});

const syrupSelectionSchema = z.object({
  syrupId: z.string(),
  quantity: z.number().int().min(1).max(10),
});

const bookedMachineSchema = z.object({
  machineId: z.string(),
  machineName: z.string(),
  quantity: z.number().int().min(1),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  machines: true, // Omit to redefine with strict validation
  selectedSyrups: true,
  bookedMachines: true,
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
  bookedMachines: z.array(bookedMachineSchema).min(1, "Au moins une machine doit être sélectionnée"),
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
}).refine((data) => {
  // Vérifier que le total des quantités dans bookedMachines correspond au champ machines
  const totalFromBooked = data.bookedMachines.reduce((sum, m) => sum + m.quantity, 0);
  return totalFromBooked === data.machines;
}, {
  message: "Le nombre total de machines ne correspond pas aux machines sélectionnées",
  path: ["machines"],
});

export const insertOfferSchema = createInsertSchema(offers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOfferMachinePriceSchema = createInsertSchema(offerMachinePrices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSyrupSchema = createInsertSchema(syrups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for machine price override (without offerId since it's provided by parent)
export const machinePriceOverrideSchema = z.object({
  machineId: z.string().min(1, "Machine ID requis"),
  amountCents: z.number().int().min(0, "Le prix doit être positif"),
});

// Schema for creating/updating offer with pricing
export const insertOfferWithPricingSchema = insertOfferSchema.extend({
  machinePriceOverrides: z.array(machinePriceOverrideSchema).optional().default([]),
});

export type InsertMachine = z.infer<typeof insertMachineSchema>;
export type Machine = typeof machines.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = typeof offers.$inferSelect;
export type InsertOfferMachinePrice = z.infer<typeof insertOfferMachinePriceSchema>;
export type OfferMachinePrice = typeof offerMachinePrices.$inferSelect;
export type InsertSyrup = z.infer<typeof insertSyrupSchema>;
export type Syrup = typeof syrups.$inferSelect;
export type SyrupSelection = z.infer<typeof syrupSelectionSchema>;
export type MachinePriceOverride = z.infer<typeof machinePriceOverrideSchema>;
export type InsertOfferWithPricing = z.infer<typeof insertOfferWithPricingSchema>;

// Type for offer with its machine price overrides (for GET requests)
export type OfferWithPricing = Offer & {
  machinePriceOverrides: OfferMachinePrice[];
};

// Settings table for tracking codes and admin configuration
export const settings = pgTable("settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(), // Unique setting key (e.g., "google_analytics", "facebook_pixel")
  value: text("value"), // Setting value (can be tracking code or other config)
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Setting = typeof settings.$inferSelect;
