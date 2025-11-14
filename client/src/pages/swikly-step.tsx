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
    
    if (piClientSecret) {
      setPaymentIntentClientSecret(piClientSecret);
      const piIdFromSecret = piClientSecret.split('_secret_')[0];
      setPaymentIntentId(piIdFromSecret);
    } else if (piId) {
      setPaymentIntentId(piId);
    }
  }, []);

  const { data: booking } = useQuery<Booking>({
    queryKey: ["/api/bookings", bookingId],
    enabled: !!bookingId,
  });

  useEffect(() => {
    // Guard: Only run once - skip if already processing or if there's an error
    if (!bookingId || !booking || isProcessing || !paymentIntentClientSecret || error) return;

    const verifyPaymentAndCreateSwikly = async () => {
      try {
        setIsProcessing(true);
        setError(null);

        const stripe = await stripePromise;
        if (!stripe) {
          throw new Error("Stripe n'a pas pu être chargé");
        }

        const { paymentIntent } = await stripe.retrievePaymentIntent(paymentIntentClientSecret);

        if (!paymentIntent) {
          throw new Error("Impossible de récupérer le statut du paiement");
        }

        if (paymentIntent.status !== 'succeeded') {
          throw new Error(`Le paiement n'a pas abouti (statut: ${paymentIntent.status}). Veuillez réessayer.`);
        }

        const response = await apiRequest("POST", `/api/bookings/${bookingId}/confirm-payment`, {
          stripePaymentIntentId: paymentIntent.id,
        });

        const data = await response.json();

        if (data.success && data.swiklyUrl) {
          // Redirect to the provided URL (Swikly external or fallback /swikly-return)
          window.location.href = data.swiklyUrl;
        } else {
          throw new Error("Impossible de créer la demande de caution Swikly");
        }
      } catch (err: any) {
        console.error("Error confirming payment:", err);
        setError(err.message || "Une erreur est survenue");
      } finally {
        setIsProcessing(false);
      }
    };

    verifyPaymentAndCreateSwikly();
  }, [bookingId, booking, paymentIntentClientSecret, isProcessing, error, setLocation]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted to-background">
      <Navbar />
      <section className="py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-2xl border-2 border-primary">
            <CardHeader className="gradient-tropical text-white p-6 text-center">
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

            <CardContent className="p-6">
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
                <div className="text-center space-y-6 py-8">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" data-testid="spinner-loading" />
                  <div className="space-y-3">
                    <p className="text-lg font-semibold text-foreground">
                      Redirection vers Swikly...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Vous allez être redirigé vers la page sécurisée Swikly pour autoriser l'empreinte bancaire de{" "}
                      {booking ? formatEuro(computeCautionAmount(booking.machines)) : "..."}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      💡 Aucun débit ne sera effectué. Vous serez automatiquement ramené sur notre site après validation.
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
