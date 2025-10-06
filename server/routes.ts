import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { insertBookingSchema } from "@shared/schema";
import { z } from "zod";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all machines
  app.get("/api/machines", async (req, res) => {
    try {
      const machines = await storage.getAllMachines();
      res.json(machines);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get available machines
  app.get("/api/machines/available", async (req, res) => {
    try {
      const machines = await storage.getAvailableMachines();
      res.json(machines);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a booking
  app.post("/api/bookings", async (req, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      
      // Calculate total price based on number of machines and duration
      const duration = validatedData.endHour - validatedData.startHour;
      let pricePerMachine = 90; // Base price for day rental
      
      if (duration >= 8) {
        pricePerMachine = 150; // Full day price
      }
      
      const totalCents = Math.round(pricePerMachine * validatedData.machines * 100);
      
      const booking = await storage.createBooking({
        ...validatedData,
        totalCents,
      });

      // Generate Swikly URL (placeholder - would integrate with real Swikly API)
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      const swiklyUrl = `${baseUrl}/swikly-redirect?booking=${booking.id}`;
      
      await storage.updateBooking(booking.id, { swiklyUrl });

      res.json({
        success: true,
        bookingId: booking.id,
        swiklyUrl,
        totalCents,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Données invalides", details: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Get all bookings (admin)
  app.get("/api/bookings", async (req, res) => {
    try {
      const bookings = await storage.getAllBookings();
      res.json(bookings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get booking by ID
  app.get("/api/bookings/:id", async (req, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ error: "Réservation non trouvée" });
      }
      res.json(booking);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update booking status
  app.patch("/api/bookings/:id/status", async (req, res) => {
    try {
      const { status } = req.body;
      const booking = await storage.updateBookingStatus(req.params.id, status);
      if (!booking) {
        return res.status(404).json({ error: "Réservation non trouvée" });
      }
      res.json(booking);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create payment intent for Stripe
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, bookingId } = req.body;
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "eur",
        metadata: {
          bookingId: bookingId || "",
        },
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ error: "Error creating payment intent: " + error.message });
    }
  });

  // Swikly redirect handler (placeholder)
  app.get("/swikly-redirect", async (req, res) => {
    const bookingId = req.query.booking as string;
    if (!bookingId) {
      return res.status(400).send("Missing booking ID");
    }
    
    // In a real implementation, this would redirect to Swikly
    // For now, simulate successful caution and redirect to payment
    await storage.updateBookingStatus(bookingId, "CONFIRMED");
    res.redirect(`/checkout?booking=${bookingId}`);
  });

  const httpServer = createServer(app);
  return httpServer;
}
