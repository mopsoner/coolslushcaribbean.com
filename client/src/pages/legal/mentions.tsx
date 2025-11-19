import Navbar from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Mentions() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted to-background">
      <Navbar />
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-xl">
            <CardHeader className="gradient-tropical text-white">
              <CardTitle className="text-3xl">Mentions Légales</CardTitle>
            </CardHeader>
            <CardContent className="p-8 prose prose-slate max-w-none">
              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">1. Éditeur du site</h2>
              <p className="text-muted-foreground">
                <strong>Cool Slush</strong><br/>
                Location de machines à Slushie professionnelles<br/>
                Téléphone : <a href="tel:+590690123456" className="text-primary hover:underline">0690 12 34 56</a><br/>
                Email : <a href="mailto:contact@coolslushlemonade.com" className="text-primary hover:underline">contact@coolslushlemonade.com</a>
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">2. Directeur de publication</h2>
              <p className="text-muted-foreground">
                Le directeur de la publication est le représentant légal de Cool Slush.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">3. Hébergement</h2>
              <p className="text-muted-foreground">
                Ce site est hébergé par :<br/>
                <strong>Replit, Inc.</strong><br/>
                548 Market St PMB 43563<br/>
                San Francisco, California 94104<br/>
                États-Unis<br/>
                <a href="https://replit.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">https://replit.com</a>
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">4. Propriété intellectuelle</h2>
              <p className="text-muted-foreground">
                L'ensemble de ce site (structure, textes, logos, images) est la propriété exclusive de Cool Slush,
                sauf mentions contraires. Toute reproduction, même partielle, est interdite sans autorisation préalable.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">5. Données personnelles</h2>
              <p className="text-muted-foreground">
                Conformément à la loi "Informatique et Libertés" du 6 janvier 1978 modifiée et au RGPD,
                vous disposez d'un droit d'accès, de rectification et de suppression des données vous concernant.
                Pour exercer ce droit, contactez-nous à : <a href="mailto:contact@coolslushlemonade.com" className="text-primary hover:underline">contact@coolslushlemonade.com</a>
              </p>
              <p className="text-muted-foreground mt-4">
                Consultez notre <a href="/legal/privacy" className="text-primary hover:underline">Politique de Confidentialité</a> pour plus d'informations.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">6. Cookies</h2>
              <p className="text-muted-foreground">
                Ce site utilise des cookies techniques nécessaires à son fonctionnement.
                Aucun cookie publicitaire n'est utilisé sans votre consentement.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">7. Limitation de responsabilité</h2>
              <p className="text-muted-foreground">
                Cool Slush s'efforce d'assurer l'exactitude des informations diffusées sur ce site,
                mais ne peut garantir l'absence d'erreurs ou d'omissions. Les informations sont susceptibles d'être modifiées sans préavis.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">8. Droit applicable</h2>
              <p className="text-muted-foreground">
                Le présent site est soumis au droit français. En cas de litige, les tribunaux français seront seuls compétents.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">9. Contact</h2>
              <p className="text-muted-foreground">
                Pour toute question concernant ces mentions légales :<br/>
                Email : <a href="mailto:contact@coolslushlemonade.com" className="text-primary hover:underline">contact@coolslushlemonade.com</a><br/>
                Téléphone : <a href="tel:+590690123456" className="text-primary hover:underline">0690 12 34 56</a>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
