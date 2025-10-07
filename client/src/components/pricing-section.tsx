import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { Offer } from "@shared/schema";

type OfferWithPrice = Offer & { amountCents: number };

const tierFeatures = {
  "1 Journée": [
    "1 machine EZBASICS",
    "Livraison & reprise", 
    "Manuel d'utilisation",
    "Support téléphonique"
  ],
  "Week-end": [
    "1 machine EZBASICS",
    "Livraison vendredi",
    "Reprise lundi",
    "Tout inclus"
  ],
  "Événement": [
    "Plusieurs machines",
    "Durée personnalisée", 
    "Tarif dégressif",
    "Accompagnement sur place"
  ]
};

const tierPeriods = {
  "1 Journée": "par machine",
  "Week-end": "par machine",
  "Événement": "location longue durée"
};

export default function PricingSection() {
  const { data: offers, isLoading } = useQuery<OfferWithPrice[]>({
    queryKey: ['/api/offers'],
  });

  const formatPrice = (offer: OfferWithPrice) => {
    if (offer.name === "Événement" && offer.amountCents === 0) {
      return "Sur devis";
    }
    return `${(offer.amountCents / 100).toFixed(0)}€`;
  };

  const isPopular = (name: string) => name === "Week-end";
  return (
    <section id="tarifs" className="py-20 bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="text-pricing-title">
            Tarifs transparents
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-pricing-subtitle">
            Aucun frais caché. Livraison et reprise incluses dans le tarif.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {isLoading ? (
            <div className="col-span-3 text-center py-12 text-muted-foreground">
              Chargement des tarifs...
            </div>
          ) : (
            offers?.map((offer, index) => {
              const popular = isPopular(offer.name);
              const features = tierFeatures[offer.name as keyof typeof tierFeatures] || [];
              const period = tierPeriods[offer.name as keyof typeof tierPeriods] || "par machine";
              const isEventOffer = offer.name === "Événement";
              
              return (
                <div 
                  key={offer.id}
                  className={`bg-card rounded-2xl p-8 shadow-lg text-center relative ${
                    popular 
                      ? "bg-primary text-primary-foreground border-4 border-primary shadow-2xl transform md:scale-105" 
                      : "border border-border"
                  }`}
                  data-testid={`card-pricing-${index}`}
                >
                  {popular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-semibold" data-testid="badge-popular">
                      Plus populaire
                    </div>
                  )}
                  
                  <div className="mb-6">
                    <div className={`text-sm font-semibold uppercase tracking-wider mb-2 ${popular ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
                      {offer.name}
                    </div>
                    <div className={`text-5xl font-bold ${popular ? 'text-white' : 'text-foreground'}`} data-testid={`text-price-${index}`}>
                      {formatPrice(offer)}
                    </div>
                    <div className={`mt-2 ${popular ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
                      {period}
                    </div>
                  </div>
                  
                  <ul className="space-y-3 mb-8 text-left">
                    {features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start" data-testid={`text-feature-${index}-${featureIndex}`}>
                        <svg className={`w-5 h-5 mr-3 mt-0.5 ${popular ? 'text-white' : 'text-primary'}`} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                        </svg>
                        <span className={popular ? 'text-primary-foreground' : 'text-muted-foreground'}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link 
                    href="/booking" 
                    className={`block w-full px-6 py-3 rounded-xl font-semibold transition-all ${
                      popular 
                        ? "bg-white text-primary hover:scale-105" 
                        : "bg-muted text-foreground hover:bg-muted/80"
                    }`}
                    data-testid={`button-choose-${index}`}
                  >
                    {isEventOffer ? "Nous contacter" : "Choisir cette option"}
                  </Link>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-12 text-center">
          <div className="inline-flex items-center bg-card px-6 py-4 rounded-xl shadow-lg border border-border" data-testid="info-caution">
            <svg className="w-5 h-5 text-primary mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
            </svg>
            <span className="text-muted-foreground">
              <strong className="text-foreground">Caution :</strong> 500€ via Swikly (sans prélèvement bancaire)
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
