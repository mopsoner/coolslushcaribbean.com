import { Link } from "wouter";

const pricingTiers = [
  {
    name: "1 Journée",
    price: "90€",
    period: "par machine",
    features: [
      "1 machine EZBASICS",
      "Livraison & reprise", 
      "Manuel d'utilisation",
      "Support téléphonique"
    ],
    popular: false
  },
  {
    name: "Week-end",
    price: "160€",
    period: "par machine", 
    features: [
      "1 machine EZBASICS",
      "Livraison vendredi",
      "Reprise lundi",
      "Tout inclus"
    ],
    popular: true
  },
  {
    name: "Événement",
    price: "Sur devis",
    period: "location longue durée",
    features: [
      "Plusieurs machines",
      "Durée personnalisée", 
      "Tarif dégressif",
      "Accompagnement sur place"
    ],
    popular: false
  }
];

export default function PricingSection() {
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
          {pricingTiers.map((tier, index) => (
            <div 
              key={index}
              className={`bg-card rounded-2xl p-8 shadow-lg text-center relative ${
                tier.popular 
                  ? "bg-primary text-primary-foreground border-4 border-primary shadow-2xl transform md:scale-105" 
                  : "border border-border"
              }`}
              data-testid={`card-pricing-${index}`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-semibold" data-testid="badge-popular">
                  Plus populaire
                </div>
              )}
              
              <div className="mb-6">
                <div className={`text-sm font-semibold uppercase tracking-wider mb-2 ${tier.popular ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
                  {tier.name}
                </div>
                <div className={`text-5xl font-bold ${tier.popular ? 'text-white' : 'text-foreground'}`} data-testid={`text-price-${index}`}>
                  {tier.price}
                </div>
                <div className={`mt-2 ${tier.popular ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
                  {tier.period}
                </div>
              </div>
              
              <ul className="space-y-3 mb-8 text-left">
                {tier.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-start" data-testid={`text-feature-${index}-${featureIndex}`}>
                    <svg className={`w-5 h-5 mr-3 mt-0.5 ${tier.popular ? 'text-white' : 'text-primary'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
                    </svg>
                    <span className={tier.popular ? 'text-primary-foreground' : 'text-muted-foreground'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              
              <Link 
                href="/booking" 
                className={`block w-full px-6 py-3 rounded-xl font-semibold transition-all ${
                  tier.popular 
                    ? "bg-white text-primary hover:scale-105" 
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
                data-testid={`button-choose-${index}`}
              >
                {index === 2 ? "Nous contacter" : "Choisir cette option"}
              </Link>
            </div>
          ))}
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
