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
      window.location.href = booking.swiklyUrl;
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
              Merci pour votre confiance
            </p>
          </div>

          {/* Main Card */}
          <Card className="shadow-2xl border-0 overflow-hidden mb-6">
            <CardHeader className="gradient-tropical text-white p-8">
              <CardTitle className="text-2xl">
                Réservation #{booking.id.slice(-8)}
              </CardTitle>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
              {/* Booking Details */}
              <div>
                <h3 className="font-bold text-lg text-foreground mb-4">📋 Détails de votre réservation</h3>
                <div className="bg-muted/50 rounded-xl p-6 space-y-3">
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
              </div>

              {/* Email Notification */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-foreground mb-2">
                      📧 Email de caution envoyé !
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Un email Swikly vous a été envoyé à l'adresse <strong className="text-foreground">{booking.customerEmail}</strong> avec un lien pour sécuriser votre caution de 500€.
                    </p>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        <strong>⚠️ Important :</strong> Vérifiez vos spams si vous ne recevez pas l'email dans les 5 minutes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Swikly Info */}
              <div className="bg-muted/50 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                  <h3 className="font-bold text-lg text-foreground">Comment ça marche ?</h3>
                </div>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">1</span>
                    <span>Cliquez sur le lien dans l'email Swikly</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">2</span>
                    <span>Entrez vos coordonnées bancaires de manière sécurisée</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">3</span>
                    <span>Une empreinte de 500€ est créée (aucun débit)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">4</span>
                    <span>Continuez vers le paiement de votre location</span>
                  </li>
                </ol>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {booking.swiklyUrl && booking.swiklyUrl.includes('swikly.com') && (
                  <Button
                    onClick={handleContinueToSwikly}
                    className="w-full gradient-tropical text-white font-bold text-lg py-4 rounded-2xl hover:shadow-2xl transition-all"
                    data-testid="button-continue-swikly"
                  >
                    <Shield className="mr-2 w-5 h-5" />
                    Accéder à la caution Swikly maintenant
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  onClick={() => setLocation("/")}
                  className="w-full rounded-2xl"
                  data-testid="button-back-home"
                >
                  Retour à l'accueil
                </Button>
              </div>

              {/* Timeline Indicator */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
                  <Clock className="w-4 h-4" />
                  <p>
                    <strong>Prochaines étapes :</strong> Complétez la caution Swikly, puis le paiement de {(booking.totalCents / 100).toFixed(2)}€ pour finaliser votre réservation.
                  </p>
                </div>
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
