import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import Navbar from "@/components/navbar";
import type { Booking } from "@shared/schema";

export default function SwiklyReturn() {
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
    refetchInterval: (query) => {
      // Poll every 2 seconds if deposit is still pending
      const data = query.state.data;
      if (data && data.depositStatus === "PENDING") {
        return 2000;
      }
      return false; // Stop polling if COMPLETED or FAILED
    },
  });

  useEffect(() => {
    if (booking && booking.depositStatus === "COMPLETED" && booking.status === "CONFIRMED") {
      // Redirect to success page after a short delay
      setTimeout(() => {
        setLocation(`/success?booking=${booking.id}`);
      }, 1500);
    }
  }, [booking, setLocation]);

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted to-background">
        <Navbar />
        <section className="py-8">
          <div className="max-w-2xl mx-auto px-4">
            <Card className="shadow-2xl border-2 border-red-500">
              <CardContent className="p-6 text-center">
                <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-600 font-semibold">
                  Identifiant de réservation manquant
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    );
  }

  if (isLoading || !booking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted to-background">
        <Navbar />
        <section className="py-8">
          <div className="max-w-2xl mx-auto px-4">
            <Card className="shadow-2xl border-2 border-primary">
              <CardContent className="p-6 text-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" data-testid="spinner-loading" />
                <p className="text-lg font-semibold">Vérification de votre réservation...</p>
                <p className="text-sm text-muted-foreground">
                  Nous vérifions que votre caution Swikly a bien été validée.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    );
  }

  // Show confirmation while waiting for redirect
  if (booking.depositStatus === "COMPLETED" && booking.status === "CONFIRMED") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted to-background">
        <Navbar />
        <section className="py-8">
          <div className="max-w-2xl mx-auto px-4">
            <Card className="shadow-2xl border-2 border-green-500">
              <CardHeader className="bg-green-500 text-white p-6 text-center">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-2" />
                <CardTitle className="text-2xl">Caution validée !</CardTitle>
              </CardHeader>
              <CardContent className="p-6 text-center space-y-4">
                <p className="text-lg">Votre empreinte bancaire a été confirmée avec succès.</p>
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Redirection vers la page de confirmation...
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    );
  }

  // Deposit failed - manual review required
  if (booking.depositStatus === "FAILED") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-muted to-background">
        <Navbar />
        <section className="py-8">
          <div className="max-w-2xl mx-auto px-4">
            <Card className="shadow-2xl border-2 border-yellow-500">
              <CardHeader className="bg-yellow-500 text-white p-6 text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <XCircle className="w-8 h-8" />
                  <CardTitle className="text-2xl">Caution non complétée</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <p className="text-lg text-center">
                  Votre paiement a été effectué avec succès, mais nous n'avons pas pu créer la demande de caution Swikly.
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Que faire maintenant ?</strong><br />
                    Notre équipe a été notifiée et vous contactera dans les 24 heures pour finaliser la caution bancaire.
                    Votre réservation est bien enregistrée.
                  </p>
                </div>
                <div className="text-center pt-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Numéro de réservation : <strong className="font-mono">{booking.id}</strong>
                  </p>
                  <button
                    onClick={() => setLocation(`/`)}
                    className="text-primary hover:underline"
                    data-testid="link-return-home"
                  >
                    Retour à l'accueil →
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    );
  }

  // Deposit is still pending
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted to-background">
      <Navbar />
      <section className="py-8">
        <div className="max-w-2xl mx-auto px-4">
          <Card className="shadow-2xl border-2 border-primary">
            <CardContent className="p-6 text-center space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" data-testid="spinner-loading" />
              <p className="text-lg font-semibold">Traitement en cours...</p>
              <p className="text-sm text-muted-foreground">
                Nous attendons la confirmation de Swikly. Cela peut prendre quelques instants.
              </p>
              <p className="text-xs text-muted-foreground">
                💡 Cette page se mettra à jour automatiquement.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
