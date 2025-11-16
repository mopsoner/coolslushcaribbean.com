import Navbar from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted to-background">
      <Navbar />
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card className="shadow-xl">
            <CardHeader className="gradient-tropical text-white">
              <CardTitle className="text-3xl">Politique de Confidentialité</CardTitle>
            </CardHeader>
            <CardContent className="p-8 prose prose-slate max-w-none">
              <p className="text-muted-foreground mb-6">Dernière mise à jour : Octobre 2025</p>
              
              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">1. Collecte des données</h2>
              <p className="text-muted-foreground">
                Cool Slush Lemonade collecte les données personnelles suivantes lors de votre réservation :
              </p>
              <ul className="text-muted-foreground list-disc pl-6 space-y-2">
                <li>Nom et prénom</li>
                <li>Adresse email</li>
                <li>Numéro de téléphone</li>
                <li>Adresse de l'événement</li>
                <li>Informations de paiement (via Stripe, non stockées sur nos serveurs)</li>
              </ul>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">2. Utilisation des données</h2>
              <p className="text-muted-foreground">
                Vos données sont utilisées exclusivement pour :
              </p>
              <ul className="text-muted-foreground list-disc pl-6 space-y-2">
                <li>Traiter votre réservation</li>
                <li>Vous contacter concernant votre location</li>
                <li>Envoyer des confirmations et rappels par email</li>
                <li>Améliorer nos services</li>
              </ul>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">3. Protection des données</h2>
              <p className="text-muted-foreground">
                Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données :
              </p>
              <ul className="text-muted-foreground list-disc pl-6 space-y-2">
                <li>Connexions sécurisées SSL/TLS</li>
                <li>Stockage crypté dans une base de données sécurisée</li>
                <li>Accès limité aux données par le personnel autorisé uniquement</li>
                <li>Paiements traités via Stripe (conforme PCI-DSS)</li>
                <li>Caution gérée via Swikly (conforme RGPD)</li>
              </ul>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">4. Partage des données</h2>
              <p className="text-muted-foreground">
                Vos données ne sont partagées qu'avec nos prestataires de confiance :
              </p>
              <ul className="text-muted-foreground list-disc pl-6 space-y-2">
                <li><strong>Stripe</strong> : traitement des paiements</li>
                <li><strong>Swikly</strong> : gestion des cautions</li>
                <li><strong>Service d'emailing</strong> : envoi des confirmations</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Nous ne vendons ni ne louons jamais vos données à des tiers.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">5. Vos droits (RGPD)</h2>
              <p className="text-muted-foreground">
                Conformément au RGPD, vous disposez des droits suivants :
              </p>
              <ul className="text-muted-foreground list-disc pl-6 space-y-2">
                <li><strong>Droit d'accès</strong> : consulter vos données</li>
                <li><strong>Droit de rectification</strong> : corriger vos données</li>
                <li><strong>Droit à l'effacement</strong> : supprimer vos données</li>
                <li><strong>Droit d'opposition</strong> : refuser le traitement</li>
                <li><strong>Droit à la portabilité</strong> : récupérer vos données</li>
              </ul>
              <p className="text-muted-foreground mt-4">
                Pour exercer ces droits, contactez-nous à : <a href="mailto:contact@coolslushlemonade.com" className="text-primary hover:underline">contact@coolslushlemonade.com</a>
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">6. Conservation des données</h2>
              <p className="text-muted-foreground">
                Vos données sont conservées pendant 3 ans à compter de votre dernière interaction avec nos services,
                sauf obligation légale de conservation plus longue (factures : 10 ans).
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">7. Cookies</h2>
              <p className="text-muted-foreground">
                Notre site utilise des cookies essentiels pour son fonctionnement (session, panier).
                Aucun cookie publicitaire ou de tracking n'est utilisé.
              </p>

              <h2 className="text-2xl font-bold text-foreground mt-8 mb-4">8. Contact</h2>
              <p className="text-muted-foreground">
                Pour toute question sur cette politique de confidentialité :<br/>
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
