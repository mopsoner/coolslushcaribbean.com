import { Link } from "wouter";
import { Calendar, Play, CheckCircle } from "lucide-react";
import slushieImage from "@assets/generated_images/Colorful_frozen_slushie_drink_68f6a306.png";

export default function HeroSection() {
  return (
    <section className="relative gradient-tropical overflow-hidden py-20 md:py-32">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="text-white">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Location de machines à Slushie professionnelles
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90">
              Rafraîchissez vos événements avec nos Slushies professionnelles. Livraison incluse, caution en ligne sécurisée.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/booking" 
                className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-white text-primary font-bold text-lg hover:shadow-2xl transition-all"
                data-testid="button-book-hero"
              >
                <Calendar className="mr-3 w-5 h-5" />
                Réserver maintenant
              </Link>
              <a 
                href="#comment-ca-marche" 
                className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-sm text-white font-semibold text-lg border-2 border-white/30 hover:bg-white/20 transition-all"
                data-testid="link-how-it-works"
              >
                <Play className="mr-3 w-5 h-5" />
                Comment ça marche
              </a>
            </div>
            <div className="mt-12 flex flex-wrap gap-6 text-white/90">
              <div className="flex items-center" data-testid="feature-delivery">
                <CheckCircle className="text-white text-xl mr-2" />
                <span>Livraison & reprise</span>
              </div>
              <div className="flex items-center" data-testid="feature-secure">
                <CheckCircle className="text-white text-xl mr-2" />
                <span>Paiement sécurisé</span>
              </div>
              <div className="flex items-center" data-testid="feature-support">
                <CheckCircle className="text-white text-xl mr-2" />
                <span>Support 7j/7</span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute -inset-4 bg-white/20 rounded-3xl blur-2xl"></div>
            <img 
              src={slushieImage} 
              alt="Boisson Slushie glacée colorée professionnelle" 
              className="relative rounded-3xl shadow-2xl w-full h-auto object-cover"
              data-testid="img-hero"
            />
            <div className="absolute -bottom-6 -right-6 bg-accent text-accent-foreground px-6 py-4 rounded-2xl shadow-2xl" data-testid="price-badge">
              <div className="text-sm font-semibold">À partir de</div>
              <div className="text-3xl font-bold">90€/jour</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
