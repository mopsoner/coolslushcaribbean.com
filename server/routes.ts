import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { insertBookingSchema, insertMachineSchema, insertOfferSchema, insertOfferMachinePriceSchema, insertSyrupSchema, insertOfferWithPricingSchema } from "@shared/schema";
import { calculateRentalDays, calculateBookingTotal } from "@shared/utils";
import { z } from "zod";
import { sendBookingConfirmation, sendSwiklyDepositEmail, sendBookingStatusChangeEmail } from "./email";
import { getSwiklyClient } from "./swikly";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

console.log('[Stripe Init] Using key starting with:', process.env.STRIPE_SECRET_KEY.substring(0, 7));
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
      
      // Calculate number of rental days
      const rentalDays = calculateRentalDays(
        validatedData.startDate instanceof Date ? validatedData.startDate : new Date(validatedData.startDate),
        validatedData.endDate instanceof Date ? validatedData.endDate : new Date(validatedData.endDate)
      );
      
      // Calculate syrup total
      let syrupTotalCents = 0;
      if (validatedData.selectedSyrups && validatedData.selectedSyrups.length > 0) {
        for (const syrupSelection of validatedData.selectedSyrups) {
          const syrup = await storage.getSyrup(syrupSelection.syrupId);
          if (syrup && syrup.amountCents > 0) {
            syrupTotalCents += syrup.amountCents * syrupSelection.quantity;
          }
        }
      }
      
      // Calculate total: (daily price × machines × days) + syrups
      const totalCents = calculateBookingTotal(
        priceData.amountCents, // This is the daily price per machine
        machineCount,
        rentalDays,
        syrupTotalCents
      );
      
      const booking = await storage.createBooking({
        ...validatedData,
        totalCents,
      });

      // Send confirmation email
      sendBookingConfirmation(booking).catch(() => {});

      res.json({
        success: true,
        bookingId: booking.id,
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
      
      // Get old booking status before update
      const oldBooking = await storage.getBooking(req.params.id);
      if (!oldBooking) {
        return res.status(404).json({ error: "Réservation non trouvée" });
      }
      const oldStatus = oldBooking.status;
      
      // Update the status
      const booking = await storage.updateBookingStatus(req.params.id, status);
      if (!booking) {
        return res.status(404).json({ error: "Réservation non trouvée" });
      }
      
      // Send email notification if status changed
      if (oldStatus !== status) {
        sendBookingStatusChangeEmail(booking, oldStatus, status).catch(error => {
          console.error('Failed to send status change email:', error);
        });
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
      
      console.log("[create-payment-intent] Request received for booking:", bookingId);
      console.log("[create-payment-intent] STRIPE_SECRET_KEY starts with:", process.env.STRIPE_SECRET_KEY?.substring(0, 7));
      
      if (!bookingId) {
        console.error("[create-payment-intent] Missing bookingId");
        return res.status(400).json({ error: "Booking ID required" });
      }

      // Get booking to verify amount server-side
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        console.error("[create-payment-intent] Booking not found:", bookingId);
        return res.status(404).json({ error: "Booking not found" });
      }

      console.log("[create-payment-intent] Creating PaymentIntent for:", {
        bookingId,
        amount: booking.totalCents,
        currency: "eur"
      });

      // Use server-calculated total, never trust client
      const paymentIntent = await stripe.paymentIntents.create({
        amount: booking.totalCents,
        currency: "eur",
        metadata: {
          bookingId: bookingId,
        },
      });
      
      console.log("[create-payment-intent] PaymentIntent created successfully:", paymentIntent.id);
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("[create-payment-intent] Error creating PaymentIntent:", {
        message: error.message,
        type: error.type,
        code: error.code,
        stack: error.stack
      });
      res.status(500).json({ error: "Error creating payment intent: " + error.message });
    }
  });

  // Confirm payment and initiate Swikly deposit (called after Stripe payment succeeds)
  app.post("/api/bookings/:id/confirm-payment", async (req, res) => {
    try {
      const bookingId = req.params.id;
      const { stripePaymentIntentId } = req.body;

      if (!stripePaymentIntentId) {
        return res.status(400).json({ error: "Payment Intent ID requis" });
      }

      // Get booking
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Réservation non trouvée" });
      }

      // Check if payment already confirmed (idempotence)
      if (booking.paymentStatus === "COMPLETED" && booking.swiklyUrl) {
        return res.json({
          success: true,
          swiklyUrl: booking.swiklyUrl,
          message: "Paiement déjà confirmé",
        });
      }

      // CRITICAL: Verify the payment with Stripe server-side
      const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentIntentId);
      
      if (!paymentIntent) {
        return res.status(400).json({ error: "Payment Intent introuvable" });
      }

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ 
          error: `Le paiement n'a pas abouti (statut: ${paymentIntent.status})` 
        });
      }

      // CRITICAL: Verify the payment belongs to this booking and matches amount
      if (paymentIntent.metadata.bookingId !== bookingId) {
        return res.status(400).json({ 
          error: "Le paiement ne correspond pas à cette réservation" 
        });
      }

      if (paymentIntent.amount !== booking.totalCents) {
        return res.status(400).json({ 
          error: "Le montant du paiement ne correspond pas au total de la réservation" 
        });
      }

      if (paymentIntent.currency !== 'eur') {
        return res.status(400).json({ 
          error: "La devise du paiement n'est pas correcte" 
        });
      }

      // Payment verified! Update payment status
      await storage.updateBooking(bookingId, {
        paymentStatus: "COMPLETED",
        stripePaymentIntentId: paymentIntent.id,
      });

      // Detect the base URL for callbacks
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:5000';
      const baseUrl = `${protocol}://${host}`;
      
      // Create Swikly deposit request via API
      let swiklyUrl = '';
      
      console.log('[confirm-payment] Creating Swikly deposit for booking:', bookingId);
      console.log('[confirm-payment] Base URL:', baseUrl);
      
      try {
        const swiklyClient = getSwiklyClient();
        console.log('[confirm-payment] Swikly client initialized');
        
        const swiklyResult = await swiklyClient.createDeposit(booking, baseUrl);
        console.log('[confirm-payment] Swikly API response:', JSON.stringify(swiklyResult, null, 2));
        
        if (swiklyResult.request?.link) {
          swiklyUrl = swiklyResult.request.link;
          console.log('[confirm-payment] Swikly URL created successfully:', swiklyUrl);
        } else {
          throw new Error('No Swikly URL returned');
        }
      } catch (swiklyError: any) {
        console.error('[confirm-payment] Swikly creation failed:', {
          message: swiklyError.message,
          stack: swiklyError.stack,
          cause: swiklyError.cause
        });
        swiklyUrl = `${baseUrl}/swikly-redirect?booking=${booking.id}`;
        console.log('[confirm-payment] Using fallback URL:', swiklyUrl);
      }
      
      // Update booking with Swikly URL
      const updatedBooking = await storage.updateBooking(bookingId, { swiklyUrl });

      // Send Swikly deposit email if API failed (Swikly sends email automatically for real URLs)
      if (updatedBooking) {
        const isRealSwiklyUrl = swiklyUrl.includes('swikly.com') || swiklyUrl.includes('swik.link');
        if (!isRealSwiklyUrl) {
          sendSwiklyDepositEmail(updatedBooking).catch(() => {});
        }
      }

      res.json({
        success: true,
        swiklyUrl,
      });
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Skip caution (pay later) - confirm booking and send Swikly link via email
  app.post("/api/bookings/:id/skip-caution", async (req, res) => {
    try {
      const bookingId = req.params.id;

      // Get booking
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Réservation non trouvée" });
      }

      // Check if booking already has a Swikly URL
      if (!booking.swiklyUrl) {
        return res.status(400).json({ error: "Lien Swikly non disponible" });
      }

      // Confirm the booking (allow user to proceed without immediate caution)
      await storage.updateBookingStatus(bookingId, "CONFIRMED");

      // Send email with Swikly link
      await sendSwiklyDepositEmail(booking);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error skipping caution:', error);
      res.status(500).json({ error: error.message });
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
  
  // Get all offers with pricing (admin)
  app.get("/api/admin/offers", async (req, res) => {
    try {
      const offers = await storage.getAllOffersWithPricing();
      res.json(offers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create an offer with pricing (admin)
  app.post("/api/admin/offers", async (req, res) => {
    try {
      const validatedData = insertOfferWithPricingSchema.parse(req.body);
      const offer = await storage.createOfferWithPricing(validatedData);
      res.json(offer);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Données invalides", details: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Update an offer with pricing (admin)
  app.patch("/api/admin/offers/:id", async (req, res) => {
    try {
      const validatedData = insertOfferWithPricingSchema.partial().parse(req.body);
      const offer = await storage.updateOfferWithPricing(req.params.id, validatedData);
      if (!offer) {
        return res.status(404).json({ error: "Offre non trouvée" });
      }
      res.json(offer);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Données invalides", details: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Delete an offer (admin)
  app.delete("/api/admin/offers/:id", async (req, res) => {
    try {
      await storage.deleteOffer(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============= ADMIN OFFER MACHINE PRICE ROUTES =============
  
  // Get all offer machine prices (admin)
  app.get("/api/admin/offer-machine-prices", async (req, res) => {
    try {
      const prices = await storage.getAllOfferMachinePrices();
      res.json(prices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get offer machine prices by offer (admin)
  app.get("/api/admin/offer-machine-prices/offer/:offerId", async (req, res) => {
    try {
      const prices = await storage.getOfferMachinePricesByOffer(req.params.offerId);
      res.json(prices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create an offer machine price (admin)
  app.post("/api/admin/offer-machine-prices", async (req, res) => {
    try {
      const validatedData = insertOfferMachinePriceSchema.parse(req.body);
      const price = await storage.createOfferMachinePrice(validatedData);
      res.json(price);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Données invalides", details: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Update an offer machine price (admin)
  app.patch("/api/admin/offer-machine-prices/:id", async (req, res) => {
    try {
      const price = await storage.updateOfferMachinePrice(req.params.id, req.body);
      if (!price) {
        return res.status(404).json({ error: "Prix machine non trouvé" });
      }
      res.json(price);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Delete an offer machine price (admin)
  app.delete("/api/admin/offer-machine-prices/:id", async (req, res) => {
    try {
      await storage.deleteOfferMachinePrice(req.params.id);
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
          paymentStatus: "PENDING",
          depositStatus: "PENDING",
          stripePaymentIntentId: null,
          swiklyRequestId: null,
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
