import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import Navbar from "@/components/navbar";

export default function SwiklyRedirect() {
  const [, setLocation] = useLocation();
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("booking");
    
    if (id) {
      setBookingId(id);
    }
  }, []);

  const handleContinueToPayment = () => {
    if (bookingId) {
      setLocation(`/checkout?booking=${bookingId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted to-background">
      <Navbar />
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-2xl border-0 overflow-hidden">
            <CardHeader className="gradient-tropical text-center text-white p-12">
              <Shield className="w-20 h-20 mx-auto mb-4" />
              <CardTitle className="text-3xl md:text-4xl font-bold mb-3">
                Caution Swikly
              </CardTitle>
              <p className="text-lg text-white/90">
                Sécurisez votre réservation avec une caution de 150€ par machine
              </p>
            </CardHeader>

            <CardContent className="p-8 md:p-12">
              <div className="space-y-6">
                {/* Information about Swikly */}
                <div className="bg-primary/5 rounded-2xl p-6 border border-primary/20">
                  <h3 className="font-bold text-lg text-foreground mb-4 flex items-center">
                    <CheckCircle className="w-5 h-5 text-primary mr-2" />
                    Comment fonctionne Swikly ?
                  </h3>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start">
                      <span className="mr-2">1.</span>
                      <span>Aucun débit bancaire n'est effectué</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">2.</span>
                      <span>Une simple empreinte bancaire de 150€ par machine est prise</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">3.</span>
                      <span>Cette empreinte est automatiquement libérée après votre événement</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">4.</span>
                      <span>Aucun frais ne sera appliqué si la machine est rendue en bon état</span>
                    </li>
                  </ul>
                </div>

                {/* Booking ID */}
                {bookingId && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Numéro de réservation</p>
                    <p className="font-mono text-xs bg-muted px-4 py-2 rounded-lg inline-block" data-testid="text-booking-id">
                      {bookingId}
                    </p>
                  </div>
                )}

                {/* Placeholder message */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl p-6 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Note de développement :</strong> L'intégration complète avec l'API Swikly sera finalisée prochainement. 
                    Pour l'instant, vous pouvez continuer directement vers le paiement.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <Button
                    onClick={handleContinueToPayment}
                    className="w-full gradient-tropical text-white font-bold text-lg py-4 rounded-2xl hover:shadow-2xl transition-all"
                    data-testid="button-continue-payment"
                  >
                    Continuer vers le paiement
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={() => setLocation("/")}
                    className="w-full rounded-2xl"
                    data-testid="button-back-home"
                  >
                    Retour à l'accueil
                  </Button>
                </div>

                {/* Security badges */}
                <div className="flex items-center justify-center gap-4 pt-6 border-t border-border">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Shield className="w-4 h-4 text-primary mr-1" />
                    Sécurisé par Swikly
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-success mr-1" />
                    Aucun prélèvement
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
