import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { CheckCircle, Home, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Booking } from "@shared/schema";
import Navbar from "@/components/navbar";
import BookingDetails from "@/components/booking-details";
import { formatEuro } from "@shared/utils";

export default function Success() {
  const searchParams = new URLSearchParams(window.location.search);
  const bookingId = searchParams.get('booking');

  const { data: booking, isLoading } = useQuery<Booking>({
    queryKey: ['/api/bookings', bookingId],
    enabled: !!bookingId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading" data-testid="loading-success" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <Navbar />
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-6" data-testid="success-icon">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          
          <h1 className="text-4xl font-bold text-foreground mb-4" data-testid="text-success-title">
            Réservation confirmée !
          </h1>
          <p className="text-lg text-muted-foreground mb-4" data-testid="text-success-subtitle">
            ✅ Paiement Stripe validé • ✅ Caution Swikly confirmée (150€ par machine)
          </p>
          <p className="text-base text-muted-foreground mb-8">
            Merci pour votre réservation. Vous allez recevoir un email de confirmation avec tous les détails.
          </p>
          
          {booking && (
            <Card className="rounded-3xl p-8 mb-8 text-left shadow-lg border border-border">
              <CardContent className="p-0">
                <h2 className="text-xl font-bold text-foreground mb-6 text-center" data-testid="text-booking-details">
                  Détails de votre réservation
                </h2>
                
                <div className="space-y-4 mb-4">
                  <div className="flex justify-between" data-testid="success-booking-id">
                    <span className="text-muted-foreground">Numéro de réservation</span>
                    <span className="font-semibold text-foreground">#{booking.id.slice(-8)}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 px-4 bg-success/10 rounded-xl border-2 border-success/20" data-testid="success-total-amount">
                    <span className="text-lg font-semibold text-foreground">Montant payé</span>
                    <span className="text-2xl font-bold text-success">{formatEuro(booking.totalCents)}</span>
                  </div>
                </div>
                
                <BookingDetails booking={booking} showTotal={true} />
              </CardContent>
            </Card>
          )}
          
          <Card className="rounded-3xl p-8 mb-8 shadow-lg border border-border">
            <CardContent className="p-0">
              <h2 className="text-xl font-bold text-foreground mb-6" data-testid="text-next-steps">
                Prochaines étapes
              </h2>
              
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-4" data-testid="step-email">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Vérifiez votre email</h3>
                    <p className="text-sm text-muted-foreground">Un email de confirmation a été envoyé à {booking?.customerEmail}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4" data-testid="step-preparation">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Préparez vos ingrédients</h3>
                    <p className="text-sm text-muted-foreground">Consultez notre guide de recettes inclus dans l'email</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4" data-testid="step-delivery">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Attendez la livraison</h3>
                    <p className="text-sm text-muted-foreground">Nous livrerons la machine le jour convenu</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4" data-testid="step-enjoy">
                  <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-success">4</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Profitez de votre événement !</h3>
                    <p className="text-sm text-muted-foreground">Régalez vos invités avec de délicieux Slushies</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <Button className="inline-flex items-center px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity" data-testid="button-home">
                <Home className="mr-2 w-4 h-4" />
                Retour à l'accueil
              </Button>
            </Link>
            <a href="tel:+590691243246">
              <Button variant="outline" className="inline-flex items-center px-6 py-3 rounded-xl font-semibold hover:bg-muted transition-colors" data-testid="button-contact">
                <Phone className="mr-2 w-4 h-4" />
                Nous contacter
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
