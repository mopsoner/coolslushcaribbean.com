import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, ExternalLink, Clock, CreditCard, Mail } from "lucide-react";
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
  const [selectedOption, setSelectedOption] = useState<'now' | 'later' | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("booking");
    const piId = params.get("payment_intent");
    const piClientSecret = params.get("payment_intent_client_secret");
    
    console.log('[swikly-step] URL params:', {
      booking: id,
      payment_intent: piId,
      payment_intent_client_secret: piClientSecret ? 'present' : 'missing'
    });
    
    if (id) {
      setBookingId(id);
    }
    
    if (piClientSecret) {
      setPaymentIntentClientSecret(piClientSecret);
      const piIdFromSecret = piClientSecret.split('_secret_')[0];
      setPaymentIntentId(piIdFromSecret);
    } else if (piId) {
      setPaymentIntentId(piId);
      // If we have payment_intent but not client_secret, this means we came from a Stripe redirect
      // The client_secret should be in the URL params added by Stripe
      console.warn('[swikly-step] payment_intent present but client_secret missing - checking redirect parameters');
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
          
          console.log('[swikly-step] Swikly URL received:', data.swiklyUrl);
          console.log('[swikly-step] Is real Swikly URL:', isRealSwiklyUrl);
          console.log('[swikly-step] URL domain:', new URL(data.swiklyUrl).hostname);
          
          // Always display the Swikly step, whether it's a real URL or fallback
          // If it's a fallback, the user will see options to complete the caution later
          setSwiklyUrl(data.swiklyUrl);
        } else {
          console.error('[swikly-step] No Swikly URL in response:', data);
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

  // Poll booking status to detect when Swikly is completed (only if user chose "pay now")
  useEffect(() => {
    // Only poll if user chose to pay now
    if (!bookingId || !swiklyUrl || selectedOption !== 'now') return;

    let pollCount = 0;
    const MAX_POLLS = 100; // 5 minutes max (100 * 3 seconds)

    const checkBookingStatus = async () => {
      try {
        pollCount++;
        
        // Stop polling after max attempts
        if (pollCount >= MAX_POLLS) {
          console.log('[swikly-step] Polling timeout reached after', pollCount, 'attempts');
          clearInterval(interval);
          return;
        }

        const response = await fetch(`/api/bookings/${bookingId}`);
        const data = await response.json();
        
        console.log('[swikly-step] Polling check #', pollCount, '- Booking status:', data.status);
        
        if (data.status === 'CONFIRMED') {
          console.log('[swikly-step] Booking confirmed! Redirecting to success page');
          clearInterval(interval);
          setLocation(`/success?booking=${bookingId}`);
        }
      } catch (err) {
        console.error('[swikly-step] Error checking booking status:', err);
      }
    };

    // Poll every 3 seconds
    const interval = setInterval(checkBookingStatus, 3000);
    
    // Also check immediately
    checkBookingStatus();

    return () => clearInterval(interval);
  }, [bookingId, swiklyUrl, selectedOption, setLocation]);

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
                Paiement validé ✓ • Caution : 150€ par machine = {booking ? formatEuro(computeCautionAmount(booking.machines)) : "..."}
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
              ) : swiklyUrl && !selectedOption ? (
                <div className="space-y-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      💡 <strong>Rappel :</strong> Il s'agit d'une empreinte bancaire de 150€ par machine, soit{" "}
                      {booking ? formatEuro(computeCautionAmount(booking.machines)) : "..."} au total, 
                      aucun débit ne sera effectué. L'empreinte sera automatiquement libérée 48h après votre événement.
                    </p>
                  </div>

                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold mb-2">Quand souhaitez-vous valider la caution ?</h3>
                    <p className="text-sm text-muted-foreground">Choisissez l'option qui vous convient le mieux</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Option 1: Payer maintenant */}
                    <Card className="border-2 border-primary/30 hover:border-primary transition-all hover:shadow-lg">
                      <CardContent className="p-6 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                          <CreditCard className="w-8 h-8 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg mb-2">Payer maintenant</h4>
                          <p className="text-sm text-muted-foreground">
                            Validez votre empreinte bancaire immédiatement pour finaliser votre réservation
                          </p>
                        </div>
                        <Button
                          onClick={() => setSelectedOption('now')}
                          className="w-full"
                          size="lg"
                          data-testid="button-pay-now"
                        >
                          <CreditCard className="w-5 h-5 mr-2" />
                          Valider maintenant
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Option 2: Payer plus tard */}
                    <Card className="border-2 border-muted hover:border-primary/50 transition-all hover:shadow-lg">
                      <CardContent className="p-6 text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                          <Clock className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="font-bold text-lg mb-2">Payer plus tard</h4>
                          <p className="text-sm text-muted-foreground">
                            Recevez le lien par email et validez quand vous le souhaitez
                          </p>
                        </div>
                        <Button
                          onClick={async () => {
                            try {
                              setIsProcessing(true);
                              await apiRequest("POST", `/api/bookings/${bookingId}/skip-caution`);
                              setLocation(`/success?booking=${bookingId}`);
                            } catch (err) {
                              setError("Impossible de finaliser la réservation");
                              setIsProcessing(false);
                            }
                          }}
                          variant="outline"
                          className="w-full"
                          size="lg"
                          disabled={isProcessing}
                          data-testid="button-pay-later"
                        >
                          {isProcessing ? (
                            <>
                              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                              Traitement...
                            </>
                          ) : (
                            <>
                              <Mail className="w-5 h-5 mr-2" />
                              Recevoir le lien par email
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : swiklyUrl && selectedOption === 'now' ? (
                <div className="space-y-6">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800 text-center">
                    <h3 className="font-bold text-lg mb-2 text-green-800 dark:text-green-200">
                      ✓ Validation de votre empreinte bancaire
                    </h3>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Complétez le formulaire Swikly ci-dessous de manière sécurisée
                    </p>
                  </div>

                  <div className="relative w-full bg-white dark:bg-gray-900 rounded-xl border-2 border-primary/20 shadow-lg overflow-hidden">
                    {!iframeLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                        <div className="text-center space-y-3">
                          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                          <p className="text-sm text-muted-foreground">Chargement du formulaire Swikly...</p>
                        </div>
                      </div>
                    )}
                    <iframe
                      src={swiklyUrl}
                      className="w-full h-[700px] border-0"
                      title="Swikly - Validation de caution"
                      onLoad={() => setIframeLoaded(true)}
                      onError={(e) => {
                        console.error('[swikly-step] Iframe error:', e);
                        setError("L'iframe Swikly n'a pas pu se charger. Veuillez réessayer.");
                      }}
                      data-testid="iframe-swikly"
                      allow="payment"
                      sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation allow-top-navigation-by-user-activation"
                    />
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
                      💡 Une fois la validation terminée, vous serez automatiquement redirigé vers votre confirmation de réservation
                    </p>
                  </div>

                  <div className="text-center pt-4 border-t">
                    <button
                      onClick={() => setSelectedOption(null)}
                      className="text-sm text-muted-foreground hover:text-foreground underline"
                      data-testid="link-change-option"
                    >
                      ← Changer d'option
                    </button>
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
