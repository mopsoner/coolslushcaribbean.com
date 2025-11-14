import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Booking } from "@shared/schema";
import Navbar from "@/components/navbar";
import { CreditCard, Shield, Lock } from "lucide-react";
import { computeCautionAmount, formatEuro } from "@shared/utils";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = ({ booking }: { booking: Booking }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/success?booking=${booking.id}`,
      },
    });

    if (error) {
      toast({
        title: "Erreur de paiement",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Paiement réussi",
        description: "Merci pour votre achat !",
      });
      setLocation(`/success?booking=${booking.id}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="form-checkout">
      <PaymentElement data-testid="payment-element" />
      <Button 
        type="submit" 
        className="w-full gradient-tropical text-white font-bold text-lg py-4 rounded-2xl"
        disabled={!stripe}
        data-testid="button-pay"
      >
        <CreditCard className="mr-2 w-5 h-5" />
        Payer {booking.totalCents / 100}€
      </Button>
    </form>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const [, setLocation] = useLocation();
  
  // Get booking ID from URL params
  const searchParams = new URLSearchParams(window.location.search);
  const bookingId = searchParams.get('booking');

  const { data: booking, isLoading } = useQuery<Booking>({
    queryKey: ['/api/bookings', bookingId],
    enabled: !!bookingId,
  });

  useEffect(() => {
    if (!bookingId) {
      setLocation('/booking');
      return;
    }

    if (booking) {
      // Create PaymentIntent as soon as the booking loads
      apiRequest("POST", "/api/create-payment-intent", { 
        bookingId: booking.id 
      })
        .then((res) => res.json())
        .then((data) => {
          setClientSecret(data.clientSecret);
        })
        .catch(() => {
          setLocation('/booking');
        });
    }
  }, [booking, bookingId, setLocation]);

  if (isLoading || !booking) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading" data-testid="loading-spinner" />
        </div>
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading" data-testid="loading-payment" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Progress Indicator */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Étape 2/2 : Paiement Stripe
            </h1>
            <p className="text-lg text-muted-foreground">
              Caution Swikly ({formatEuro(computeCautionAmount(booking.machines))}) validée ✓ • Payez maintenant {formatEuro(booking.totalCents)}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            
            {/* Booking Summary */}
            <Card className="rounded-3xl shadow-lg border border-border">
              <CardHeader className="bg-muted/50 rounded-t-3xl">
                <CardTitle className="text-2xl font-bold text-foreground" data-testid="text-booking-summary">
                  Récapitulatif de votre réservation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="space-y-4">
                  <div className="flex justify-between" data-testid="booking-detail-id">
                    <span className="text-muted-foreground">Réservation</span>
                    <span className="font-semibold text-foreground">#{booking.id.slice(-8)}</span>
                  </div>
                  <div className="flex justify-between" data-testid="booking-detail-offer">
                    <span className="text-muted-foreground">Offre</span>
                    <span className="font-semibold text-foreground">{booking.offer}</span>
                  </div>
                  <div className="flex justify-between" data-testid="booking-detail-date">
                    <span className="text-muted-foreground">
                      {new Date(booking.startDate).toDateString() !== new Date(booking.endDate).toDateString() ? 'Période' : 'Date'}
                    </span>
                    <span className="font-semibold text-foreground">
                      {new Date(booking.startDate).toDateString() !== new Date(booking.endDate).toDateString() 
                        ? `${new Date(booking.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${new Date(booking.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
                        : new Date(booking.startDate).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div className="flex justify-between" data-testid="booking-detail-time">
                    <span className="text-muted-foreground">Horaires</span>
                    <span className="font-semibold text-foreground">
                      {booking.startHour.toString().padStart(2, '0')}:00 - {booking.endHour.toString().padStart(2, '0')}:00
                    </span>
                  </div>
                  <div className="flex justify-between" data-testid="booking-detail-machines">
                    <span className="text-muted-foreground">Machines</span>
                    <span className="font-semibold text-foreground">{booking.machines}x EZBASICS</span>
                  </div>
                  <div className="flex justify-between" data-testid="booking-detail-customer">
                    <span className="text-muted-foreground">Client</span>
                    <span className="font-semibold text-foreground">{booking.customerName}</span>
                  </div>
                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between text-lg font-bold" data-testid="booking-detail-total">
                      <span className="text-foreground">Total à payer</span>
                      <span className="text-primary">{booking.totalCents / 100}€</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Form */}
            <Card className="rounded-3xl shadow-lg border border-border">
              <CardHeader className="gradient-tropical text-white rounded-t-3xl">
                <CardTitle className="text-2xl font-bold flex items-center">
                  <CreditCard className="mr-3 w-8 h-8" />
                  Paiement sécurisé
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {/* Make SURE to wrap the form in <Elements> which provides the stripe context. */}
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <CheckoutForm booking={booking} />
                </Elements>
                
                <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center" data-testid="security-ssl">
                    <Shield className="w-4 h-4 text-primary mr-2" />
                    <span>SSL sécurisé</span>
                  </div>
                  <div className="flex items-center" data-testid="security-stripe">
                    <Lock className="w-4 h-4 text-primary mr-2" />
                    <span>Stripe</span>
                  </div>
                  <div className="flex items-center" data-testid="security-pci">
                    <Shield className="w-4 h-4 text-primary mr-2" />
                    <span>PCI DSS</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
