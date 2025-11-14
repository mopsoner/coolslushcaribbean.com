import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2, ExternalLink } from "lucide-react";
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
  const [swiklyUrl, setSwiklyUrl] = useState<string | null>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);

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
    // Guard: Only run once - skip if we already have a Swikly URL or if there's an error
    if (!bookingId || !booking || isProcessing || !paymentIntentClientSecret || swiklyUrl || error) return;

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
          const isRealSwiklyUrl = data.swiklyUrl.includes('swikly.com') || 
                                   data.swiklyUrl.includes('swik.link');
          
          if (isRealSwiklyUrl) {
            // Display Swikly in iframe
            setSwiklyUrl(data.swiklyUrl);
          } else {
            // Fallback URL - redirect to success
            setLocation(`/success?booking=${bookingId}`);
          }
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
  }, [bookingId, booking, paymentIntentClientSecret, isProcessing, swiklyUrl, error, setLocation]);

  // Poll booking status to detect when Swikly is completed
  useEffect(() => {
    if (!bookingId || !swiklyUrl) return;

    let pollCount = 0;
    const MAX_POLLS = 100; // 5 minutes max (100 * 3 seconds)

    const checkBookingStatus = async () => {
      try {
        pollCount++;
        
        // Stop polling after max attempts
        if (pollCount >= MAX_POLLS) {
          console.log('Polling timeout reached');
          clearInterval(interval);
          return;
        }

        const response = await fetch(`/api/bookings/${bookingId}`);
        const data = await response.json();
        
        if (data.bookingStatus === 'CONFIRMED') {
          clearInterval(interval);
          setLocation(`/success?booking=${bookingId}`);
        }
      } catch (err) {
        console.error('Error checking booking status:', err);
      }
    };

    // Poll every 3 seconds
    const interval = setInterval(checkBookingStatus, 3000);
    
    // Also check immediately
    checkBookingStatus();

    return () => clearInterval(interval);
  }, [bookingId, swiklyUrl, setLocation]);

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
              ) : swiklyUrl ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      💡 <strong>Rappel :</strong> Il s'agit d'une empreinte bancaire de{" "}
                      {booking ? formatEuro(computeCautionAmount(booking.machines)) : "..."}, 
                      aucun débit ne sera effectué. L'empreinte sera automatiquement libérée 48h après votre événement.
                    </p>
                  </div>

                  {!iframeLoaded && (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">Chargement du formulaire Swikly...</p>
                    </div>
                  )}

                  <div className="relative" style={{ minHeight: '600px' }}>
                    <iframe
                      src={swiklyUrl}
                      className="w-full border-0 rounded-lg"
                      style={{ height: '600px', display: iframeLoaded ? 'block' : 'none' }}
                      onLoad={() => setIframeLoaded(true)}
                      title="Swikly - Autorisation d'empreinte bancaire"
                      sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                      allow="payment"
                      data-testid="iframe-swikly"
                    />
                  </div>

                  <div className="text-center pt-4">
                    <a
                      href={swiklyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                      data-testid="link-open-swikly-new-tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Ouvrir dans un nouvel onglet
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-6 py-8">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" data-testid="spinner-loading" />
                  <div className="space-y-3">
                    <p className="text-lg font-semibold text-foreground">
                      Préparation de votre caution Swikly...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Création du lien d'autorisation d'empreinte bancaire
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
