import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import Navbar from "@/components/navbar";
import type { Booking } from "@shared/schema";
import { computeCautionAmount, formatEuro } from "@shared/utils";

if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function SwiklyStep() {
  const [, setLocation] = useLocation();
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [paymentIntentClientSecret, setPaymentIntentClientSecret] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("booking");
    const piId = params.get("payment_intent");
    const piClientSecret = params.get("payment_intent_client_secret");
    
    if (id) {
      setBookingId(id);
    }
    
    // Store the client secret for verification
    if (piClientSecret) {
      setPaymentIntentClientSecret(piClientSecret);
      // Extract the ID from the client secret
      // Format: pi_xxxxx_secret_yyyyy -> we need pi_xxxxx
      const piIdFromSecret = piClientSecret.split('_secret_')[0];
      setPaymentIntentId(piIdFromSecret);
    } else if (piId) {
      // If we only have the ID (shouldn't happen anymore), we can't verify
      setPaymentIntentId(piId);
    }
  }, []);

  const { data: booking } = useQuery<Booking>({
    queryKey: ["/api/bookings", bookingId],
    enabled: !!bookingId,
  });

  useEffect(() => {
    if (!bookingId || !booking || isProcessing || !paymentIntentClientSecret) return;

    const verifyPaymentAndRedirect = async () => {
      try {
        setIsProcessing(true);
        setError(null);

        // First, verify the Stripe payment actually succeeded
        const stripe = await stripePromise;
        if (!stripe) {
          throw new Error("Stripe n'a pas pu être chargé");
        }

        // Retrieve the payment intent to verify status using the client secret
        const { paymentIntent } = await stripe.retrievePaymentIntent(paymentIntentClientSecret);

        if (!paymentIntent) {
          throw new Error("Impossible de récupérer le statut du paiement");
        }

        if (paymentIntent.status !== 'succeeded') {
          throw new Error(`Le paiement n'a pas abouti (statut: ${paymentIntent.status}). Veuillez réessayer.`);
        }

        // Payment verified! Now call the confirm payment endpoint to create Swikly deposit
        const response = await apiRequest("POST", `/api/bookings/${bookingId}/confirm-payment`, {
          stripePaymentIntentId: paymentIntent.id,
        });

        const data = await response.json();

        if (data.success && data.swiklyUrl) {
          // Check if it's a real Swikly URL or a fallback
          const isRealSwiklyUrl = data.swiklyUrl.includes('swikly.com') || 
                                   data.swiklyUrl.includes('swik.link');
          
          if (isRealSwiklyUrl) {
            // Redirect to Swikly
            window.location.href = data.swiklyUrl;
          } else {
            // It's a fallback URL, navigate directly to success
            setLocation(`/success?booking=${bookingId}`);
          }
        } else {
          throw new Error("Impossible de créer la demande de caution Swikly");
        }
      } catch (err: any) {
        console.error("Error confirming payment:", err);
        setError(err.message || "Une erreur est survenue");
        setIsProcessing(false);
      }
    };

    verifyPaymentAndRedirect();
  }, [bookingId, booking, paymentIntentClientSecret, isProcessing, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted to-background">
      <Navbar />
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-2xl border-2 border-primary">
            <CardHeader className="gradient-tropical text-white p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Shield className="w-8 h-8" />
                <CardTitle className="text-2xl md:text-3xl">
                  Étape 2/2 : Caution Swikly
                </CardTitle>
              </div>
              <p className="text-white/90 text-lg">
                Paiement de {booking ? formatEuro(booking.totalCents) : "..."} validé ✓
              </p>
            </CardHeader>

            <CardContent className="p-8">
              {error ? (
                <div className="text-center space-y-4">
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border-2 border-red-200 dark:border-red-700">
                    <p className="text-red-800 dark:text-red-200 font-semibold">
                      ⚠️ Une erreur est survenue
                    </p>
                    <p className="text-red-600 dark:text-red-300 text-sm mt-2">
                      {error}
                    </p>
                  </div>
                  <button
                    onClick={() => setLocation(`/success?booking=${bookingId}`)}
                    className="text-primary hover:underline"
                    data-testid="link-skip-swikly"
                  >
                    Continuer sans caution →
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-6">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" data-testid="spinner-loading" />
                  <div className="space-y-3">
                    <p className="text-lg font-semibold text-foreground">
                      Préparation de votre caution Swikly...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Vous allez être redirigé vers Swikly pour autoriser l'empreinte bancaire de{" "}
                      {booking ? formatEuro(computeCautionAmount(booking.machines)) : "..."}
                    </p>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      💡 <strong>Rappel :</strong> Il s'agit d'une empreinte bancaire, aucun débit ne sera effectué. 
                      L'empreinte sera automatiquement libérée 48h après votre événement.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
