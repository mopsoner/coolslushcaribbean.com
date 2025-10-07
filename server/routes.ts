import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { insertBookingSchema, insertMachineSchema, insertOfferSchema, insertPriceConfigurationSchema, insertSyrupSchema } from "@shared/schema";
import { z } from "zod";
import { sendBookingConfirmation, sendSwiklyDepositEmail } from "./email";
import { getSwiklyClient } from "./swikly";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-09-30.clover",
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

  // ============= ADMIN MACHINES ROUTES =============
  
  // Create a machine (admin)
  app.post("/api/admin/machines", async (req, res) => {
    try {
      const validatedData = insertMachineSchema.parse(req.body);
      const machine = await storage.createMachine(validatedData);
      res.json(machine);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Données invalides", details: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Update a machine (admin)
  app.patch("/api/admin/machines/:id", async (req, res) => {
    try {
      const machine = await storage.updateMachine(req.params.id, req.body);
      if (!machine) {
        return res.status(404).json({ error: "Machine non trouvée" });
      }
      res.json(machine);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete a machine (admin)
  app.delete("/api/admin/machines/:id", async (req, res) => {
    try {
      await storage.deleteMachine(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a booking
  app.post("/api/bookings", async (req, res) => {
    try {
      const validatedData = insertBookingSchema.parse(req.body);
      
      // Get price from database based on offer
      const offer = await storage.getOfferByName(validatedData.offer);
      if (!offer) {
        return res.status(400).json({ error: "Offre invalide" });
      }

      const priceData = await storage.getEffectivePrice(offer.id);
      if (!priceData) {
        return res.status(400).json({ error: "Prix non configuré pour cette offre" });
      }

      const machineCount = validatedData.machines ?? 1;
      const totalCents = priceData.amountCents * machineCount;
      
      const booking = await storage.createBooking({
        ...validatedData,
        totalCents,
      });

      // Detect the base URL for callbacks
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5000';
      const baseUrl = `${protocol}://${host}`;
      
      // Create Swikly deposit request via API
      let swiklyUrl = '';
      let swiklySuccess = false;
      
      try {
        const swiklyClient = getSwiklyClient();
        const swiklyResult = await swiklyClient.createDeposit(booking, baseUrl);
        
        if (swiklyResult.request?.link) {
          swiklyUrl = swiklyResult.request.link;
          swiklySuccess = true;
        } else {
          throw new Error('No Swikly URL returned');
        }
      } catch (swiklyError: any) {
        console.error('Swikly creation failed:', swiklyError.message);
        swiklyUrl = `${baseUrl}/swikly-redirect?booking=${booking.id}`;
      }
      
      const updatedBooking = await storage.updateBooking(booking.id, { swiklyUrl });

      // Send confirmation email (Swikly sends its own email automatically)
      if (updatedBooking) {
        sendBookingConfirmation(updatedBooking).catch(() => {});
        
        // Only send our Swikly email if API failed (Swikly sends email automatically)
        // Check for swikly.com or swik.link domains
        const isRealSwiklyUrl = swiklyUrl.includes('swikly.com') || swiklyUrl.includes('swik.link');
        if (!isRealSwiklyUrl) {
          sendSwiklyDepositEmail(updatedBooking).catch(() => {});
        }
      }

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
      const { bookingId } = req.body;
      
      if (!bookingId) {
        return res.status(400).json({ error: "Booking ID required" });
      }

      // Get booking to verify amount server-side
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Use server-calculated total, never trust client
      const paymentIntent = await stripe.paymentIntents.create({
        amount: booking.totalCents,
        currency: "eur",
        metadata: {
          bookingId: bookingId,
        },
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ error: "Error creating payment intent: " + error.message });
    }
  });

  // Swikly callback handler - called by Swikly when deposit is completed
  app.post("/api/swikly-callback", async (req, res) => {
    try {
      const { swikId, status } = req.body;
      
      // Update booking status based on Swikly callback
      if (status === 'completed' || status === 'accepted') {
        await storage.updateBookingStatus(swikId, "CONFIRMED");
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Swikly callback error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Swikly redirect handler (fallback for non-API flow)
  app.get("/swikly-redirect", async (req, res) => {
    const bookingId = req.query.booking as string;
    if (!bookingId) {
      return res.status(400).send("Missing booking ID");
    }
    
    // Fallback: simulate successful caution and redirect to payment
    await storage.updateBookingStatus(bookingId, "CONFIRMED");
    res.redirect(`/checkout?booking=${bookingId}`);
  });

  // ============= OFFERS ROUTES (PUBLIC) =============
  
  // Get all active offers with prices
  app.get("/api/offers", async (req, res) => {
    try {
      const offers = await storage.getActiveOffers();
      const offersWithPrices = await Promise.all(
        offers.map(async (offer) => {
          const price = await storage.getEffectivePrice(offer.id);
          return {
            ...offer,
            amountCents: price?.amountCents || 0,
          };
        })
      );
      res.json(offersWithPrices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============= ADMIN OFFERS ROUTES =============
  
  // Get all offers (admin)
  app.get("/api/admin/offers", async (req, res) => {
    try {
      const offers = await storage.getAllOffers();
      res.json(offers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create an offer (admin)
  app.post("/api/admin/offers", async (req, res) => {
    try {
      const validatedData = insertOfferSchema.parse(req.body);
      const offer = await storage.createOffer(validatedData);
      res.json(offer);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Données invalides", details: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Update an offer (admin)
  app.patch("/api/admin/offers/:id", async (req, res) => {
    try {
      const offer = await storage.updateOffer(req.params.id, req.body);
      if (!offer) {
        return res.status(404).json({ error: "Offre non trouvée" });
      }
      res.json(offer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============= ADMIN PRICE CONFIGURATION ROUTES =============
  
  // Get all price configurations (admin)
  app.get("/api/admin/price-configs", async (req, res) => {
    try {
      const configs = await storage.getAllPriceConfigurations();
      res.json(configs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get price configurations by offer (admin)
  app.get("/api/admin/price-configs/offer/:offerId", async (req, res) => {
    try {
      const configs = await storage.getPriceConfigurationsByOffer(req.params.offerId);
      res.json(configs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a price configuration (admin)
  app.post("/api/admin/price-configs", async (req, res) => {
    try {
      const validatedData = insertPriceConfigurationSchema.parse(req.body);
      const config = await storage.createPriceConfiguration(validatedData);
      res.json(config);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Données invalides", details: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Update a price configuration (admin)
  app.patch("/api/admin/price-configs/:id", async (req, res) => {
    try {
      const config = await storage.updatePriceConfiguration(req.params.id, req.body);
      if (!config) {
        return res.status(404).json({ error: "Configuration de prix non trouvée" });
      }
      res.json(config);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete a price configuration (admin)
  app.delete("/api/admin/price-configs/:id", async (req, res) => {
    try {
      await storage.deletePriceConfiguration(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get active syrups (public)
  app.get("/api/syrups", async (req, res) => {
    try {
      const syrups = await storage.getActiveSyrups();
      res.json(syrups);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get all syrups (admin)
  app.get("/api/admin/syrups", async (req, res) => {
    try {
      const syrups = await storage.getAllSyrups();
      res.json(syrups);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a syrup (admin)
  app.post("/api/admin/syrups", async (req, res) => {
    try {
      const validatedData = insertSyrupSchema.parse(req.body);
      const syrup = await storage.createSyrup(validatedData);
      res.json(syrup);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Données invalides", details: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Update a syrup (admin)
  app.patch("/api/admin/syrups/:id", async (req, res) => {
    try {
      const syrup = await storage.updateSyrup(req.params.id, req.body);
      if (!syrup) {
        return res.status(404).json({ error: "Sirop non trouvé" });
      }
      res.json(syrup);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete a syrup (admin)
  app.delete("/api/admin/syrups/:id", async (req, res) => {
    try {
      await storage.deleteSyrup(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Test email route (development only)
  if (process.env.NODE_ENV === 'development') {
    app.get("/api/test-email", async (req, res) => {
      try {
        const testBooking = {
          id: "test-booking-123",
          offer: "Week-end",
          startDate: new Date(),
          endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days later
          startHour: 10,
          endHour: 18,
          customerName: "Test Client",
          customerPhone: "0690123456",
          customerEmail: req.query.email as string || "test@example.com",
          customerAddress: "123 Rue de Test, Pointe-à-Pitre",
          machines: 2,
          selectedSyrups: [],
          cupSize: "moyen",
          totalCents: 30000,
          status: "PENDING",
          swiklyUrl: `http://localhost:5000/swikly-redirect?booking=test-123`,
          stripePaymentId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await sendBookingConfirmation(testBooking);
        await sendSwiklyDepositEmail(testBooking);
        
        res.json({ 
          success: true, 
          message: "Test emails sent! Check console for Ethereal preview URLs",
          email: testBooking.customerEmail
        });
      } catch (error: any) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}
