import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { bookingStatusUpdateSchema } from "@shared/schema";
import type { BookingStatusStore } from "./booking-status";
import { BookingTransitionError, transitionBookingStatus } from "./booking-status";
import type { Booking, BookingStatus } from "@shared/schema";

export function registerAdminBookingStatusRoute(
  app: Express,
  store: BookingStatusStore,
  requireAdmin: RequestHandler,
  onStatusChanged?: (booking: Booking, oldStatus: string, newStatus: BookingStatus) => void,
): void {
  app.patch("/api/admin/bookings/:id/status", requireAdmin, async (req, res) => {
    try {
      // Body validation deliberately precedes every storage access.
      const update = bookingStatusUpdateSchema.parse(req.body);
      const booking = await store.getBooking(req.params.id);
      if (!booking) return res.status(404).json({ error: "Réservation non trouvée" });

      const updated = await transitionBookingStatus(store, booking, {
        ...update,
        actor: "admin",
      });
      if (updated && booking.status !== update.status) {
        onStatusChanged?.(updated, booking.status, update.status);
      }
      return res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Données invalides", details: error.errors });
      }
      if (error instanceof BookingTransitionError) {
        return res.status(409).json({ error: error.message });
      }
      return res.status(500).json({ error: error instanceof Error ? error.message : "Erreur interne" });
    }
  });
}
