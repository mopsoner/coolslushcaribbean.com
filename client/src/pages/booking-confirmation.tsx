import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Mail, Shield, ArrowRight, Clock } from "lucide-react";
import Navbar from "@/components/navbar";
import type { Booking } from "@shared/schema";

export default function BookingConfirmation() {
  const [, setLocation] = useLocation();
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("booking");
    if (id) {
      setBookingId(id);
    }
  }, []);

  const { data: booking, isLoading } = useQuery<Booking>({
    queryKey: ["/api/bookings", bookingId],
    enabled: !!bookingId,
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

  const bookingDate = new Date(booking.date).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleContinueToSwikly = () => {
    if (booking.swiklyUrl) {
      // If it's a real Swikly URL (swikly.com, app.swikly, or swik.link), navigate to it
      if (booking.swiklyUrl.includes('swikly.com') || booking.swiklyUrl.includes('app.swikly') || booking.swiklyUrl.includes('swik.link')) {
        window.location.href = booking.swiklyUrl;
      } else {
        // Otherwise, it's a fallback URL - navigate to checkout directly
        setLocation(`/checkout?booking=${booking.id}`);
      }
    }
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

          {/* PROMINENT SWIKLY CALL-TO-ACTION */}
          {booking.swiklyUrl && (
            <Card className="shadow-2xl border-4 border-primary mb-6 overflow-hidden animate-in fade-in-50 duration-500">
              <CardHeader className="gradient-tropical text-white p-8 text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <Shield className="w-8 h-8" />
                  <CardTitle className="text-2xl md:text-3xl">
                    Étape suivante : Caution Swikly
                  </CardTitle>
                </div>
                <p className="text-white/90 text-lg">
                  Sécurisez votre location en un clic
                </p>
              </CardHeader>

              <CardContent className="p-8 space-y-6">
                <div className="text-center space-y-4">
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 rounded-2xl p-6 border-2 border-blue-200 dark:border-blue-700">
                    <p className="text-lg font-semibold text-foreground mb-2">
                      💳 Empreinte bancaire de 500€
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Aucun débit immédiat • Sécurisé par Swikly • Libérée automatiquement après votre location
                    </p>
                  </div>

                  {(booking.swiklyUrl.includes('swikly.com') || booking.swiklyUrl.includes('app.swikly') || booking.swiklyUrl.includes('swik.link')) ? (
                    <Button
                      onClick={handleContinueToSwikly}
                      size="lg"
                      className="w-full gradient-tropical text-white font-bold text-xl py-6 rounded-2xl hover:shadow-2xl transition-all transform hover:scale-105"
                      data-testid="button-continue-swikly"
                    >
                      <Shield className="mr-3 w-6 h-6" />
                      Payer la caution maintenant
                      <ArrowRight className="ml-3 w-6 h-6" />
                    </Button>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          ⚠️ Le lien Swikly sera envoyé par email. Vérifiez votre boîte de réception à <strong>{booking.customerEmail}</strong>
                        </p>
                      </div>
                      <Button
                        onClick={handleContinueToSwikly}
                        size="lg"
                        variant="outline"
                        className="w-full font-bold text-lg py-6 rounded-2xl"
                        data-testid="button-continue-swikly-fallback"
                      >
                        <Mail className="mr-3 w-5 h-5" />
                        Accéder au lien de caution
                      </Button>
                    </div>
                  )}

                  <div className="bg-muted/50 rounded-xl p-4">
                    <p className="text-xs text-muted-foreground text-center">
                      📧 Un email de confirmation avec le lien a également été envoyé à <strong className="text-foreground">{booking.customerEmail}</strong>
                    </p>
                  </div>
                </div>

                {/* How it Works */}
                <div className="border-t border-border pt-6">
                  <h4 className="font-bold text-center text-foreground mb-4">🔒 Comment ça marche ?</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">1</span>
                      <span className="text-sm text-muted-foreground">Cliquez sur le bouton ci-dessus</span>
                    </div>
                    <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">2</span>
                      <span className="text-sm text-muted-foreground">Entrez vos coordonnées bancaires</span>
                    </div>
                    <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">3</span>
                      <span className="text-sm text-muted-foreground">Empreinte créée (aucun débit)</span>
                    </div>
                    <div className="flex items-start gap-3 bg-muted/30 rounded-lg p-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">4</span>
                      <span className="text-sm text-muted-foreground">Continuez vers le paiement</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Booking Details Card */}
          <Card className="shadow-xl border-0 overflow-hidden mb-6">
            <CardHeader className="bg-muted/50 p-6">
              <CardTitle className="text-xl text-foreground">📋 Détails de votre réservation</CardTitle>
            </CardHeader>

            <CardContent className="p-6">
              <div className="bg-white dark:bg-muted/30 rounded-xl p-6 space-y-3 border border-border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-semibold text-foreground">{bookingDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Horaires</span>
                  <span className="font-semibold text-foreground">
                    {booking.startHour.toString().padStart(2, '0')}:00 - {booking.endHour.toString().padStart(2, '0')}:00
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Machines</span>
                  <span className="font-semibold text-foreground">
                    {booking.machines} machine{booking.machines > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-3">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-xl text-primary">
                    {(booking.totalCents / 100).toFixed(2)}€
                  </span>
                </div>
              </div>

              {/* Timeline Indicator */}
              <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                  <Clock className="w-4 h-4" />
                  <p>
                    <strong>Prochaines étapes :</strong> Complétez la caution Swikly ci-dessus, puis le paiement de {(booking.totalCents / 100).toFixed(2)}€ pour finaliser votre réservation.
                  </p>
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
              <a href="tel:+590690123456" className="text-primary font-semibold hover:underline">
                0690 12 34 56
              </a>
              {" "}ou par email à{" "}
              <a href="mailto:contact@coolslush.gp" className="text-primary font-semibold hover:underline">
                contact@coolslush.gp
              </a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
