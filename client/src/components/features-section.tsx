import { Truck, Shield, ServerCog, Clock, Utensils, Headphones } from "lucide-react";

const features = [
  {
    icon: Truck,
    title: "Livraison incluse",
    description: "Nous livrons et récupérons la machine à votre domicile ou lieu d'événement partout en Guadeloupe.",
    gradient: "gradient-tropical"
  },
  {
    icon: Shield,
    title: "Caution en ligne", 
    description: "Système de caution 100% sécurisé via Swikly. Aucun prélèvement, juste une garantie dématérialisée.",
    gradient: "gradient-tropical"
  },
  {
    icon: ServerCog,
    title: "Machine professionnelle",
    description: "Machine Ninja Slushi haut de gamme, facile à utiliser, avec manuel d'utilisation et assistance téléphonique.",
    gradient: "gradient-tropical"
  },
  {
    icon: Clock,
    title: "Location flexible",
    description: "Choisissez vos horaires selon vos besoins. Location journalière ou pour plusieurs jours consécutifs.",
    gradient: "gradient-sunset"
  },
  {
    icon: Utensils,
    title: "Recettes incluses",
    description: "Guide de recettes tropicales et conseils pour réaliser les meilleurs granités et cocktails glacés.",
    gradient: "gradient-sunset"
  },
  {
    icon: Headphones,
    title: "Support client",
    description: "Une question ? Notre équipe est disponible 7j/7 pour vous accompagner avant, pendant et après votre location.",
    gradient: "gradient-sunset"
  }
];

export default function FeaturesSection() {
  return (
    <section id="services" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="text-features-title">
            Pourquoi choisir Cool'Slush ?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-features-subtitle">
            Nous offrons bien plus qu'une simple location de machine. Profitez d'un service complet pour vos événements.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="feature-card bg-card rounded-2xl p-8 shadow-lg border border-border"
              data-testid={`card-feature-${index}`}
            >
              <div className={`w-16 h-16 ${feature.gradient} rounded-xl flex items-center justify-center mb-6`}>
                <feature.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-card-foreground mb-3" data-testid={`text-feature-title-${index}`}>
                {feature.title}
              </h3>
              <p className="text-muted-foreground" data-testid={`text-feature-desc-${index}`}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
