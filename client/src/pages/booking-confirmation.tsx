import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Mail, Shield, ArrowRight, Clock, CreditCard } from "lucide-react";
import Navbar from "@/components/navbar";
import BookingDetails from "@/components/booking-details";
import type { PublicBooking } from "@shared/schema";
import { computeCautionAmount, formatEuro } from "@shared/utils";

export default function BookingConfirmation() {
  const [, setLocation] = useLocation();
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("booking");
    setAccessToken(params.get("token"));
    if (id) {
      setBookingId(id);
    }
  }, []);

  const { data: booking, isLoading } = useQuery<PublicBooking>({
    queryKey: [`/api/bookings/${bookingId}?token=${encodeURIComponent(accessToken ?? "")}`],
    enabled: !!bookingId && !!accessToken,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted to-background">
        <Navbar />
        <section className="py-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Chargement...</p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted to-background">
        <Navbar />
        <section className="py-20">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Réservation non trouvée</p>
                <Button onClick={() => setLocation("/")} className="mt-4">
                  Retour à l'accueil
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    );
  }

  const startDate = new Date(booking.startDate);
  const endDate = new Date(booking.endDate);
  
  const bookingDate = startDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const isMultipleDays = startDate.toDateString() !== endDate.toDateString();
  const dateDisplay = isMultipleDays 
    ? `${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : bookingDate;

  const handleContinueToCheckout = () => {
    setLocation(`/checkout?booking=${booking.id}&token=${encodeURIComponent(accessToken!)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted to-background">
      <Navbar />
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Success Message */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success/10 mb-4">
              <CheckCircle className="w-12 h-12 text-success" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Réservation confirmée !
            </h1>
            <p className="text-lg text-muted-foreground">
              Réservation #{booking.id.slice(-8)}
            </p>
          </div>

          {/* PROMINENT STRIPE PAYMENT CALL-TO-ACTION */}
          <Card className="shadow-2xl border-4 border-primary mb-6 overflow-hidden animate-in fade-in-50 duration-500">
            <CardHeader className="gradient-tropical text-white p-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <CreditCard className="w-8 h-8" />
                <CardTitle className="text-2xl md:text-3xl">
                  Étape 1/2 : Paiement Stripe
                </CardTitle>
              </div>
              <p className="text-white/90 text-lg">
                Payez {formatEuro(booking.totalCents)} • Ensuite caution Swikly de {formatEuro(computeCautionAmount(booking.machines))} (150€ par machine)
              </p>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
              <div className="text-center space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl p-6 border-2 border-blue-200 dark:border-blue-700">
                  <p className="text-lg font-semibold text-foreground mb-2">
                    💳 Paiement sécurisé de {formatEuro(booking.totalCents)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Paiement par carte bancaire • 100% sécurisé par Stripe • Confirmation immédiate
                  </p>
                </div>

                <Button
                  onClick={handleContinueToCheckout}
                  size="lg"
                  className="w-full gradient-tropical text-white font-bold text-xl py-6 rounded-2xl hover:shadow-2xl transition-all transform hover:scale-105"
                  data-testid="button-continue-checkout"
                >
                  <CreditCard className="mr-3 w-6 h-6" />
                  Procéder au paiement
                  <ArrowRight className="ml-3 w-6 h-6" />
                </Button>

                <div className="bg-muted/50 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground text-center">
                    📧 Un email de confirmation a été envoyé à <strong className="text-foreground">{booking.customerEmail}</strong>
                  </p>
                </div>
              </div>

              {/* How it Works */}
              <div className="border-t border-border pt-6">
                <h4 className="font-bold text-center text-foreground mb-4">🔒 Le processus en 4 étapes</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">1</span>
                    <span className="text-sm text-muted-foreground">Cliquez sur le bouton ci-dessus</span>
                  </div>
                  <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">2</span>
                    <span className="text-sm text-muted-foreground">Payez {formatEuro(booking.totalCents)} par carte</span>
                  </div>
                  <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">3</span>
                    <span className="text-sm text-muted-foreground">Validez la caution Swikly (empreinte, aucun débit)</span>
                  </div>
                  <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">4</span>
                    <span className="text-sm text-muted-foreground">Réservation confirmée !</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Details Card */}
          <Card className="shadow-xl border-0 overflow-hidden mb-6">
            <CardHeader className="bg-muted/50 p-6">
              <CardTitle className="text-xl text-foreground mb-4">📋 Détails de votre réservation</CardTitle>
              <div className="flex justify-between items-center py-3 px-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border-2 border-primary/20" data-testid="confirmation-total-amount">
                <span className="text-lg font-semibold text-foreground">Montant total</span>
                <span className="text-2xl font-bold text-primary">{formatEuro(booking.totalCents)}</span>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <BookingDetails booking={booking} showTotal={false} />

              {/* Timeline Indicator */}
              <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-200">
                  <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold mb-2">Prochaines étapes :</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Effectuez le <strong>paiement Stripe</strong> de {formatEuro(booking.totalCents)}</li>
                      <li>Validez ensuite la <strong>caution Swikly</strong> (empreinte bancaire 150€ par machine, soit {formatEuro(computeCautionAmount(booking.machines))} au total, aucun débit)</li>
                    </ol>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setLocation("/")}
                  className="w-full rounded-xl"
                  data-testid="button-back-home"
                >
                  Retour à l'accueil
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Help Section */}
          <div className="text-center text-sm text-muted-foreground">
            <p>
              Besoin d'aide ? Contactez-nous au{" "}
              <a href="tel:+590691243246" className="text-primary font-semibold hover:underline">
                0691 24 32 46
              </a>
              {" "}ou par email à{" "}
              <a href="mailto:contact@coolslushlemonade.com" className="text-primary font-semibold hover:underline">
                contact@coolslushlemonade.com
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
