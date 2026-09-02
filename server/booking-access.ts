import { createHash, timingSafeEqual } from "crypto";
import type { Express } from "express";
import type { Booking, PublicBooking } from "@shared/schema";
import type { IStorage } from "./storage";
import { requireAdmin } from "./auth-middleware";

export const hashAccessToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function hasBookingAccess(booking: Booking, token: unknown): boolean {
  if (typeof token !== "string" || !token || !booking.accessTokenHash) return false;
  const supplied = Buffer.from(hashAccessToken(token), "hex");
  const expected = Buffer.from(booking.accessTokenHash, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function toPublicBooking(booking: Booking): PublicBooking {
  const { id, offer, startDate, endDate, startHour, endHour, customerName,
    customerEmail, machines, cupSize, totalCents, status, paymentStatus,
    depositStatus, createdAt, updatedAt } = booking;
  return {
    id, offer, startDate, endDate, startHour, endHour, customerName, customerEmail,
    machines, cupSize, totalCents, status, paymentStatus, depositStatus, createdAt,
    updatedAt,
    bookedMachines: (booking.bookedMachines ?? []).map(({ machineName, quantity }) => ({ machineName, quantity })),
  };
}

export function registerBookingReadRoutes(app: Express, bookingStorage: Pick<IStorage, "getAllBookings" | "getBooking">) {
  app.get("/api/admin/bookings", requireAdmin, async (_req, res) => {
    res.json(await bookingStorage.getAllBookings());
  });

  app.get("/api/bookings/:id", async (req, res) => {
    const booking = await bookingStorage.getBooking(req.params.id);
    if (!booking) return res.status(404).json({ error: "Réservation non trouvée" });
    if (!hasBookingAccess(booking, req.query.token)) {
      return res.status(403).json({ error: "Jeton d'accès invalide" });
    }
    res.json(toPublicBooking(booking));
  });
}
