import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import HeroSection from "@/components/hero-section";
import FeaturesSection from "@/components/features-section";
import PricingSection from "@/components/pricing-section";
import { useQuery } from "@tanstack/react-query";
import { Machine } from "@shared/schema";
import MachineCard from "@/components/machine-card";
import { Link } from "wouter";
import { Clock, CheckCircle, Phone, Star, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";

const steps = [
  {
    number: 1,
    title: "Réservez en ligne",
    description: "Choisissez votre date et remplissez le formulaire de réservation en quelques clics.",
    gradient: "gradient-tropical"
  },
  {
    number: 2, 
    title: "Caution Swikly",
    description: "Validez votre caution en ligne de manière sécurisée. Aucun argent n'est débité.",
    gradient: "gradient-tropical"
  },
  {
    number: 3,
    title: "Livraison", 
    description: "Nous livrons la machine chez vous ou sur votre lieu d'événement à l'heure convenue.",
    gradient: "gradient-sunset"
  },
  {
    number: 4,
    title: "Profitez !",
    description: "Régalez vos invités avec de délicieux Slushies. Nous récupérons la machine le lendemain.",
    gradient: "gradient-sunset"
  }
];

const testimonials = [
  {
    name: "Marie L.",
    rating: 5,
    comment: "Service impeccable ! La machine était parfaite pour l'anniversaire de ma fille. Les enfants ont adoré et la livraison était ponctuelle.",
    initial: "M"
  },
  {
    name: "Jean-Philippe D.",
    rating: 5, 
    comment: "Excellent rapport qualité/prix. La réservation en ligne est super simple et le système de caution Swikly très rassurant.",
    initial: "J"
  },
  {
    name: "Sophie M.",
    rating: 5,
    comment: "Nous avons loué 2 machines pour notre mariage. Tout s'est parfaitement déroulé. Je recommande vivement Cool Slush !",
    initial: "S"
  }
];

const faqs = [
  {
    question: "Comment fonctionne la caution Swikly ?",
    answer: "Swikly est un système de caution 100% en ligne et sécurisé. Nous bloquons temporairement 150€ par machine sur votre carte bancaire, mais aucun débit n'est effectué. La caution est automatiquement libérée après la restitution de la machine en bon état."
  },
  {
    question: "Quelles zones de livraison couvrez-vous ?",
    answer: "La livraison est incluse dans le tarif de location sans frais supplémentaires."
  },
  {
    question: "Fournissez-vous les ingrédients ?",
    answer: "Non, les ingrédients ne sont pas inclus. Nous fournissons un guide complet avec des recettes et la liste des ingrédients à acheter. Vous pouvez utiliser des sirops du commerce ou préparer vos propres recettes."
  },
  {
    question: "Puis-je annuler ma réservation ?",
    answer: "Oui, vous pouvez annuler jusqu'à 48h avant la date de livraison pour un remboursement complet. Au-delà, des frais d'annulation de 50% s'appliquent. Contactez-nous par téléphone ou email."
  },
  {
    question: "La machine est-elle facile à utiliser ?",
    answer: "Absolument ! Nos machines Ninja sont conçues pour être intuitives. Nous fournissons un manuel d'utilisation détaillé et notre équipe est disponible 7j/7 pour vous accompagner par téléphone si besoin."
  }
];

function AccordionItem({ question, answer, isOpen, onClick }: { question: string; answer: string; isOpen: boolean; onClick: () => void }) {
  return (
    <Card className="rounded-2xl shadow-lg border border-border overflow-hidden">
      <button 
        className="w-full px-8 py-6 text-left flex items-center justify-between hover:bg-muted/30 transition-colors"
        onClick={onClick}
        data-testid="button-accordion-toggle"
      >
        <span className="font-semibold text-foreground text-lg">{question}</span>
        <ChevronDown className={`text-primary transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="px-8 pb-6 text-muted-foreground" data-testid="text-accordion-content">
          {answer}
        </div>
      )}
    </Card>
  );
}

export default function Home() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  
  const { data: machines, isLoading } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      
      {/* How It Works Section */}
      <section id="comment-ca-marche" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="text-how-it-works-title">
              Comment ça marche ?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-how-it-works-subtitle">
              4 étapes simples pour profiter de votre machine à Slushie
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center" data-testid={`step-${index}`}>
                <div className="relative mb-6">
                  <div className={`w-20 h-20 ${step.gradient} rounded-full flex items-center justify-center mx-auto`}>
                    <span className="text-3xl font-bold text-white">{step.number}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 left-full w-full h-1 bg-border -translate-y-1/2"></div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3" data-testid={`text-step-title-${index}`}>
                  {step.title}
                </h3>
                <p className="text-muted-foreground" data-testid={`text-step-desc-${index}`}>
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PricingSection />

      {/* Machine Availability Section */}
      <section id="machines" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="text-machines-title">
              Nos machines disponibles
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-machines-subtitle">
              Des machines professionnelles Ninja Slushi 2,5L avec 5 programmes : Slushi, Milkshake, Frozen Drink, Smoothie et Glace italienne
            </p>
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted rounded-3xl h-64"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {machines?.map((machine) => (
                <MachineCard key={machine.id} machine={machine} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="text-testimonials-title">
              Ce que disent nos clients
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-testimonials-subtitle">
              Ils ont fait confiance à Cool Slush pour leurs événements
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="rounded-2xl p-8 shadow-lg border border-border" data-testid={`card-testimonial-${index}`}>
                <CardContent className="p-0">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
                      {testimonial.initial}
                    </div>
                    <div className="ml-4">
                      <div className="font-semibold text-foreground" data-testid={`text-testimonial-name-${index}`}>
                        {testimonial.name}
                      </div>
                      <div className="flex text-yellow-400" data-testid={`rating-testimonial-${index}`}>
                        {Array.from({ length: testimonial.rating }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-muted-foreground" data-testid={`text-testimonial-comment-${index}`}>
                    {testimonial.comment}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4" data-testid="text-faq-title">
              Questions fréquentes
            </h2>
            <p className="text-lg text-muted-foreground" data-testid="text-faq-subtitle">
              Tout ce que vous devez savoir sur la location
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFaqIndex === index}
                onClick={() => toggleFaq(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary to-secondary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ 
            backgroundImage: `url('data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')` 
          }}></div>
        </div>
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6" data-testid="text-cta-title">
            Prêt à rafraîchir votre événement ?
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto" data-testid="text-cta-subtitle">
            Réservez dès maintenant votre machine à Slushie et profitez d'une livraison gratuite
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/booking">
              <Button className="inline-flex items-center px-8 py-4 rounded-2xl bg-white text-primary font-bold text-lg hover:shadow-2xl transition-all" data-testid="button-cta-book">
                Réserver maintenant
              </Button>
            </Link>
            <a 
              href="tel:+590690123456" 
              className="inline-flex items-center px-8 py-4 rounded-2xl bg-white/10 backdrop-blur-sm text-white font-semibold text-lg border-2 border-white/30 hover:bg-white/20 transition-all"
              data-testid="link-cta-phone"
            >
              <Phone className="mr-3 w-5 h-5" />
              0690 12 34 56
            </a>
          </div>

          <div className="mt-12 flex flex-wrap justify-center gap-8 text-white/80">
            <div className="flex items-center" data-testid="cta-feature-delivery">
              <Clock className="text-2xl mr-3" />
              <span>Livraison rapide</span>
            </div>
            <div className="flex items-center" data-testid="cta-feature-support">
              <Phone className="text-2xl mr-3" />
              <span>Support 7j/7</span>
            </div>
            <div className="flex items-center" data-testid="cta-feature-rating">
              <Star className="text-2xl mr-3" />
              <span>Service 5 étoiles</span>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
