import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";
import { storage } from "./storage";
import { insertBookingSchema, insertMachineSchema, insertOfferSchema, insertOfferMachinePriceSchema, insertSyrupSchema, insertOfferWithPricingSchema, insertSettingSchema } from "@shared/schema";
import { calculateRentalDays, calculateBookingTotal } from "@shared/utils";
import { z } from "zod";
import { sendBookingConfirmation, sendSwiklyDepositEmail, sendBookingStatusChangeEmail } from "./email";
import { getSwiklyClient } from "./swikly";
import { authCheck, authLogin, authLogout, requireAdmin } from "./auth-middleware";
import { ObjectStorageService } from "./objectStorage";
import { hashAccessToken, hasBookingAccess, registerBookingReadRoutes } from "./booking-access";
import { registerAdminBookingStatusRoute } from "./admin-booking-status";
import { registerSwiklyWebhookRoute } from "./swikly-webhook";
import { BookingAvailabilityError } from "./booking-reservation";

const uploadMachineImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé. Utilisez JPEG, PNG, GIF ou WebP.'));
    }
  }
});

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

console.log('[Stripe Init] Using key starting with:', process.env.STRIPE_SECRET_KEY.substring(0, 7));
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function registerRoutes(app: Express): Promise<Server> {
  registerBookingReadRoutes(app, storage);
  registerAdminBookingStatusRoute(app, storage, requireAdmin, (booking, oldStatus, newStatus) => {
    sendBookingStatusChangeEmail(booking, oldStatus, newStatus).catch(error => {
      console.error("Failed to send status change email:", error);
    });
  });
  registerSwiklyWebhookRoute(app, storage);
  
  // ============= AUTH ROUTES =============
  
  // Login
  app.post("/api/auth/login", authLogin);
  
  // Logout
  app.post("/api/auth/logout", authLogout);
  
  // Check auth status
  app.get("/api/auth/check", authCheck);
  
  // ============= SETTINGS ROUTES =============
  
  // Get all active settings (public)
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getActiveSettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get all settings (admin)
  app.get("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Update or create setting (admin)
  app.post("/api/admin/settings", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertSettingSchema.parse(req.body);
      const setting = await storage.upsertSetting(validatedData);
      res.json(setting);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Données invalides", details: error.errors });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });
  
  // Delete setting (admin)
  app.delete("/api/admin/settings/:key", requireAdmin, async (req, res) => {
    try {
      await storage.deleteSetting(req.params.key);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
  
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
  app.post("/api/admin/machines", requireAdmin, async (req, res) => {
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
  app.patch("/api/admin/machines/:id", requireAdmin, async (req, res) => {
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
  app.delete("/api/admin/machines/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteMachine(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Upload machine image (admin) - uses Object Storage for persistence
  app.post("/api/admin/machines/:id/image", requireAdmin, uploadMachineImage.single('image'), async (req, res) => {
    try {
      const machineId = req.params.id;
      const file = req.file;
      
      if (!file) {
        return res.status(400).json({ error: "Aucune image fournie" });
      }
      
      const machine = await storage.getMachine(machineId);
      if (!machine) {
        return res.status(404).json({ error: "Machine non trouvée" });
      }
      
      const objectStorageService = new ObjectStorageService();
      
      if (machine.imageUrl && machine.imageUrl.startsWith('/')) {
        await objectStorageService.deleteFile(machine.imageUrl);
      }
      
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      const fileName = `${uniqueSuffix}${ext}`;
      
      const imageUrl = await objectStorageService.uploadFile(file.buffer, fileName, file.mimetype);
      const updatedMachine = await storage.updateMachine(machineId, { imageUrl });
      
      res.json(updatedMachine);
    } catch (error: any) {
      console.error("Error uploading machine image:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete machine image (admin)
  app.delete("/api/admin/machines/:id/image", requireAdmin, async (req, res) => {
    try {
      const machineId = req.params.id;
      
      const machine = await storage.getMachine(machineId);
      if (!machine) {
        return res.status(404).json({ error: "Machine non trouvée" });
      }
      
      if (machine.imageUrl && machine.imageUrl.startsWith('/')) {
        const objectStorageService = new ObjectStorageService();
        await objectStorageService.deleteFile(machine.imageUrl);
      }
      
      const updatedMachine = await storage.updateMachine(machineId, { imageUrl: null });
      res.json(updatedMachine);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Serve machine images from Object Storage
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
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

      // Calculate total machine count from bookedMachines
      const machineCount = validatedData.bookedMachines.reduce((sum, m) => sum + m.quantity, 0);
      
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
      
      const accessToken = randomBytes(32).toString("base64url");
      const booking = await storage.createBooking({
        ...validatedData,
        totalCents,
        accessTokenHash: hashAccessToken(accessToken),
      });

      // Send confirmation email
      sendBookingConfirmation(booking).catch(() => {});

      res.json({
        success: true,
        bookingId: booking.id,
        accessToken,
        totalCents,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Données invalides", details: error.errors });
      } else if (error instanceof BookingAvailabilityError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  // Update booking (admin - full edit)
  app.patch("/api/admin/bookings/:id", requireAdmin, async (req, res) => {
    try {
      const bookingId = req.params.id;
      
      // Check if booking exists
      const existingBooking = await storage.getBooking(bookingId);
      if (!existingBooking) {
        return res.status(404).json({ error: "Réservation non trouvée" });
      }
      
      // Define allowed fields for editing (don't allow editing machines, totalCents, payment-related fields)
      const allowedFields = [
        'customerName', 'customerEmail', 'customerPhone', 'customerAddress',
        'startDate', 'endDate', 'startHour', 'endHour'
      ];
      
      // Build update object with only allowed fields
      const updates: Record<string, any> = {};
      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          if (field === 'startDate' || field === 'endDate') {
            updates[field] = new Date(req.body[field]);
          } else {
            updates[field] = req.body[field];
          }
        }
      }
      
      // Validate hour ranges
      if (updates.startHour !== undefined && (updates.startHour < 0 || updates.startHour > 23)) {
        return res.status(400).json({ error: "L'heure de début doit être entre 0 et 23" });
      }
      if (updates.endHour !== undefined && (updates.endHour < 1 || updates.endHour > 24)) {
        return res.status(400).json({ error: "L'heure de fin doit être entre 1 et 24" });
      }
      
      // Validate date order
      const startDate = updates.startDate || existingBooking.startDate;
      const endDate = updates.endDate || existingBooking.endDate;
      if (new Date(endDate) < new Date(startDate)) {
        return res.status(400).json({ error: "La date de fin doit être après la date de début" });
      }
      
      // Track if status changed for email notification
      const oldStatus = existingBooking.status;
      
      // Update the booking
      const booking = await storage.updateBooking(bookingId, updates);
      if (!booking) {
        return res.status(404).json({ error: "Réservation non trouvée" });
      }
      
      // Send email notification if status changed
      if (updates.status && oldStatus !== updates.status) {
        sendBookingStatusChangeEmail(booking, oldStatus, updates.status).catch(error => {
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
      const { bookingId, accessToken } = req.body;
      
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
      if (!hasBookingAccess(booking, accessToken)) {
        return res.status(403).json({ error: "Jeton d'accès invalide" });
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
      const { stripePaymentIntentId, accessToken } = req.body;

      if (!stripePaymentIntentId) {
        return res.status(400).json({ error: "Payment Intent ID requis" });
      }

      // Get booking
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Réservation non trouvée" });
      }
      if (!hasBookingAccess(booking, accessToken)) {
        return res.status(403).json({ error: "Jeton d'accès invalide" });
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
      
      // Generate a secure one-time token for Swikly return URL validation
      const crypto = await import('crypto');
      const returnToken = crypto.randomBytes(32).toString('hex');
      const tokenCreatedAt = new Date();
      
      // Store the token and timestamp in the database (will be validated when Swikly redirects user)
      await storage.updateBooking(bookingId, { 
        swiklyReturnToken: returnToken,
        swiklyReturnTokenCreatedAt: tokenCreatedAt,
      });
      console.log('[confirm-payment] Generated secure return token for booking:', bookingId);
      
      // Create Swikly deposit request via API
      let swiklyUrl = '';
      
      console.log('[confirm-payment] Creating Swikly deposit for booking:', bookingId);
      console.log('[confirm-payment] Base URL:', baseUrl);
      
      try {
        const swiklyClient = getSwiklyClient();
        console.log('[confirm-payment] Swikly client initialized');
        
        const swiklyResult = await swiklyClient.createDeposit(booking, baseUrl, returnToken);
        console.log('[confirm-payment] Swikly API response:', JSON.stringify(swiklyResult, null, 2));
        
        if (swiklyResult.request?.link && swiklyResult.request.id) {
          swiklyUrl = swiklyResult.request.link;
          await storage.updateBooking(bookingId, { swiklyRequestId: swiklyResult.request.id });
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
        if (process.env.NODE_ENV === "production" || process.env.SWIKLY_DEMO_MODE !== "true") throw swiklyError;
        swiklyUrl = `${baseUrl}/swikly-redirect?booking=${booking.id}&token=${encodeURIComponent(accessToken)}`;
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

  // "Pay later" only re-sends the deposit link; it never validates the deposit or order.
  app.post("/api/bookings/:id/skip-caution", async (req, res) => {
    try {
      const bookingId = req.params.id;

      // Get booking
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        return res.status(404).json({ error: "Réservation non trouvée" });
      }
      if (!hasBookingAccess(booking, req.body?.accessToken)) {
        return res.status(403).json({ error: "Jeton d'accès invalide" });
      }

      // Check if booking already has a Swikly URL
      if (!booking.swiklyUrl) {
        return res.status(400).json({ error: "Lien Swikly non disponible" });
      }

      // Send email with Swikly link
      await sendSwiklyDepositEmail(booking);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error skipping caution:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Swikly return URL handler - called by Swikly after user validates deposit
  // This provides immediate redirection without relying on webhooks or polling
  app.get("/api/swikly-return", async (req, res) => {
    try {
      const bookingId = req.query.booking as string;
      const providedToken = req.query.token as string;
      
      console.log('[swikly-return] Return URL called by Swikly for booking:', bookingId);
      console.log('[swikly-return] Token provided:', providedToken ? 'yes' : 'no');
      
      // Validate required parameters
      if (!bookingId || !providedToken) {
        console.error('[swikly-return] Missing required parameters');
        return res.status(400).send("Paramètres manquants");
      }
      
      // Verify the booking exists
      const booking = await storage.getBooking(bookingId);
      if (!booking) {
        console.error('[swikly-return] Booking not found:', bookingId);
        return res.status(404).send("Réservation introuvable");
      }
      
      // CRITICAL SECURITY CHECK: Verify the token matches
      if (!booking.swiklyReturnToken || !booking.swiklyReturnTokenCreatedAt) {
        console.error('[swikly-return] No token stored for booking - may have already been used');
        // If already confirmed, just redirect to success (idempotent)
        if (booking.status === 'CONFIRMED') {
          console.log('[swikly-return] Booking already confirmed, redirecting to success');
          return res.redirect(`/success?booking=${bookingId}`);
        }
        return res.status(400).send("Token invalide ou déjà utilisé");
      }
      
      if (booking.swiklyReturnToken !== providedToken) {
        console.error('[swikly-return] Token mismatch - possible security breach attempt');
        return res.status(403).send("Token de sécurité invalide");
      }
      
      // Check token expiration (24 hours)
      const tokenAge = Date.now() - booking.swiklyReturnTokenCreatedAt.getTime();
      const MAX_TOKEN_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      
      if (tokenAge > MAX_TOKEN_AGE) {
        console.error('[swikly-return] Token expired - created at:', booking.swiklyReturnTokenCreatedAt);
        // Clear expired token
        await storage.updateBooking(bookingId, {
          swiklyReturnToken: null,
          swiklyReturnTokenCreatedAt: null,
        });
        return res.status(400).send("Token expiré. Veuillez contacter le support.");
      }
      
      // Verify payment was completed (additional security)
      if (booking.paymentStatus !== 'COMPLETED') {
        console.error('[swikly-return] Payment not completed for booking:', bookingId);
        return res.status(400).send("Le paiement n'a pas été complété");
      }
      
      // A browser redirect is not proof that the deposit succeeded. Only the
      // authenticated webhook may update depositStatus/status.
      await storage.updateBooking(bookingId, {
        swiklyReturnToken: null,
        swiklyReturnTokenCreatedAt: null,
      });
      if (booking.depositStatus !== 'COMPLETED') {
        return res.redirect(`/swikly-step?booking=${bookingId}&pending=1`);
      }
      res.redirect(`/success?booking=${bookingId}`);
    } catch (error: any) {
      console.error('[swikly-return] Error processing return:', error);
      res.status(500).send("Une erreur est survenue. Veuillez contacter le support.");
    }
  });

  // Swikly redirect handler (fallback for non-API flow)
  app.get("/swikly-redirect", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).send("Swikly demo mode is forbidden in production");
    }
    if (process.env.SWIKLY_DEMO_MODE !== "true") {
      return res.status(404).send("Swikly demo mode is disabled");
    }
    const bookingId = req.query.booking as string;
    const accessToken = req.query.token as string;
    if (!bookingId || !accessToken) {
      return res.status(400).send("Missing booking credentials");
    }

    const booking = await storage.getBooking(bookingId);
    if (!booking || !hasBookingAccess(booking, accessToken)) {
      return res.status(403).send("Jeton d'accès invalide");
    }

    // Demo navigation is deliberately read-only.
    res.redirect(`/success?booking=${bookingId}&token=${encodeURIComponent(accessToken)}`);
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
  app.get("/api/admin/offers", requireAdmin, async (req, res) => {
    try {
      const offers = await storage.getAllOffersWithPricing();
      res.json(offers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create an offer with pricing (admin)
  app.post("/api/admin/offers", requireAdmin, async (req, res) => {
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
  app.patch("/api/admin/offers/:id", requireAdmin, async (req, res) => {
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
  app.delete("/api/admin/offers/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteOffer(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============= ADMIN OFFER MACHINE PRICE ROUTES =============
  
  // Get all offer machine prices (admin)
  app.get("/api/admin/offer-machine-prices", requireAdmin, async (req, res) => {
    try {
      const prices = await storage.getAllOfferMachinePrices();
      res.json(prices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get offer machine prices by offer (admin)
  app.get("/api/admin/offer-machine-prices/offer/:offerId", requireAdmin, async (req, res) => {
    try {
      const prices = await storage.getOfferMachinePricesByOffer(req.params.offerId);
      res.json(prices);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create an offer machine price (admin)
  app.post("/api/admin/offer-machine-prices", requireAdmin, async (req, res) => {
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
  app.patch("/api/admin/offer-machine-prices/:id", requireAdmin, async (req, res) => {
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
  app.delete("/api/admin/offer-machine-prices/:id", requireAdmin, async (req, res) => {
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
  app.get("/api/admin/syrups", requireAdmin, async (req, res) => {
    try {
      const syrups = await storage.getAllSyrups();
      res.json(syrups);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create a syrup (admin)
  app.post("/api/admin/syrups", requireAdmin, async (req, res) => {
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
  app.patch("/api/admin/syrups/:id", requireAdmin, async (req, res) => {
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
  app.delete("/api/admin/syrups/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteSyrup(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ============= CONTACT FORM ROUTE =============
  
  const contactFormSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    subject: z.string().min(1),
    message: z.string().min(10),
    website: z.string().optional(),
  });

  app.post("/api/contact", async (req, res) => {
    try {
      const parseResult = contactFormSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          error: "Données invalides. Veuillez vérifier les champs du formulaire.",
          details: parseResult.error.errors 
        });
      }
      
      const data = parseResult.data;
      
      // Honeypot check - if website field is filled, it's likely a bot
      if (data.website && data.website.trim() !== '') {
        console.log('Honeypot triggered - bot detected');
        // Return success to not alert the bot, but don't send email
        return res.json({ success: true, message: "Message envoyé avec succès" });
      }
      
      const subjectLabels: Record<string, string> = {
        special_request: "Demande spéciale",
        quote: "Demande de devis",
        event: "Événement particulier",
        question: "Question générale",
        other: "Autre",
      };
      
      const subjectLabel = subjectLabels[data.subject] || data.subject;
      
      // Send email using nodemailer
      const { sendContactFormEmail } = await import("./email");
      await sendContactFormEmail({
        name: data.name,
        email: data.email,
        phone: data.phone || "Non fourni",
        subject: subjectLabel,
        message: data.message,
      });
      
      res.json({ success: true, message: "Message envoyé avec succès" });
    } catch (error: any) {
      console.error("Contact form error:", error);
      res.status(500).json({ error: "Erreur lors de l'envoi du message. Veuillez réessayer." });
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
          customerPhone: "0691243246",
          customerEmail: req.query.email as string || "test@example.com",
          customerAddress: "123 Rue de Test, Pointe-à-Pitre",
          accessTokenHash: hashAccessToken("test-access-token"),
          machines: 2,
          bookedMachines: [
            { machineId: "test-machine-1", machineName: "Ninja Slushi #1", quantity: 1 },
            { machineId: "test-machine-2", machineName: "Ninja Slushi #2", quantity: 1 }
          ],
          selectedSyrups: [],
          cupSize: "moyen",
          totalCents: 30000,
          status: "PENDING",
          paymentStatus: "PENDING",
          depositStatus: "PENDING",
          stripePaymentIntentId: null,
          swiklyRequestId: null,
          lastSwiklyEventId: null,
          swiklyUrl: `http://localhost:5000/swikly-redirect?booking=test-123`,
          swiklyReturnToken: null,
          swiklyReturnTokenCreatedAt: null,
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
