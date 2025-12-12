import Navbar from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted to-background">
      <Navbar />
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-xl">
            <CardHeader className="gradient-tropical text-white">
              <CardTitle className="text-3xl">Conditions Générales d'Utilisation</CardTitle>
            </CardHeader>
            <CardContent className="p-8 prose prose-slate max-w-none">
              <p className="text-muted-foreground mb-6">Dernière mise à jour : Octobre 2025</p>
              
              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">1. Présentation du service</h2>
              <p className="text-muted-foreground">
                Cool Slush propose un service de location de machines à Slushie professionnelles 
                pour événements privés et professionnels.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">2. Conditions de location</h2>
              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">2.1 Durée de location</h3>
              <p className="text-muted-foreground">
                La location est proposée pour une durée minimale de 4 heures et maximale de 24 heures.
              </p>
              
              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">2.2 Livraison et installation</h3>
              <p className="text-muted-foreground">
                La livraison, l'installation et la reprise de la machine sont incluses dans le tarif de location.
                Le client doit s'assurer qu'un espace approprié et une prise électrique sont disponibles.
              </p>

              <h3 className="text-xl font-semibold text-foreground mt-6 mb-3">2.3 Utilisation</h3>
              <ul className="text-muted-foreground list-disc pl-6 space-y-2">
                <li>La machine doit être utilisée conformément aux instructions fournies</li>
                <li>Seuls les produits recommandés (sirops, fruits) doivent être utilisés</li>
                <li>Le client est responsable du nettoyage basique pendant l'utilisation</li>
                <li>Toute détérioration due à une mauvaise utilisation sera facturée</li>
              </ul>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">3. Tarifs et paiement</h2>
              <p className="text-muted-foreground">
                Les tarifs sont affichés TTC sur notre site. Le paiement s'effectue en ligne via Stripe.
                Une caution de 150€ par machine est requise via Swikly (sans débit bancaire).
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">4. Caution Swikly</h2>
              <p className="text-muted-foreground">
                Une empreinte bancaire de 150€ par machine est prise via Swikly pour garantir le bon état de la machine.
                Cette caution est automatiquement libérée 48h après la restitution de la machine en bon état.
                Aucun débit n'est effectué sauf en cas de dommage constaté.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">5. Annulation</h2>
              <ul className="text-muted-foreground list-disc pl-6 space-y-2">
                <li>Annulation gratuite jusqu'à 48h avant l'événement</li>
                <li>Entre 48h et 24h : retenue de 50% du montant</li>
                <li>Moins de 24h : aucun remboursement</li>
              </ul>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">6. Responsabilité</h2>
              <p className="text-muted-foreground">
                Cool Slush s'engage à fournir du matériel en parfait état de fonctionnement.
                Le client est responsable du matériel pendant toute la durée de location.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">7. Contact</h2>
              <p className="text-muted-foreground">
                Pour toute question concernant ces conditions, contactez-nous :<br/>
                Téléphone : <a href="tel:+590691243246" className="text-primary hover:underline">0691 24 32 46</a><br/>
                Email : <a href="mailto:contact@coolslushlemonade.com" className="text-primary hover:underline">contact@coolslushlemonade.com</a>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
