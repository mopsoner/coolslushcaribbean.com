import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Navbar from "@/components/navbar";

export default function TestEmail() {
  const [email, setEmail] = useState("test@coolslush.gp");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch(`/api/test-email?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted to-background">
      <Navbar />
      <section className="py-20">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card>
            <CardHeader>
              <CardTitle>Test Email - Mode Développement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Email de test</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="test@example.com"
                />
              </div>

              <Button 
                onClick={handleTest} 
                disabled={loading}
                className="w-full"
              >
                {loading ? "Envoi..." : "Envoyer les emails de test"}
              </Button>

              {result && (
                <div className={`p-4 rounded-lg ${result.error ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                  {result.error ? (
                    <p><strong>Erreur:</strong> {result.error}</p>
                  ) : (
                    <>
                      <p><strong>✅ {result.message}</strong></p>
                      <p className="mt-2">Email envoyé à: {result.email}</p>
                      <p className="mt-4 text-sm">
                        📧 <strong>Vérifiez les logs de la console du serveur pour voir les liens de prévisualisation Ethereal.</strong>
                      </p>
                      <p className="mt-2 text-sm">
                        Les emails de test ont été envoyés via Ethereal (compte de test gratuit).
                        Dans les logs du serveur, vous verrez des URLs commençant par https://ethereal.email/message/...
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                <p><strong>ℹ️ Comment ça marche:</strong></p>
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li>Ethereal est un service de test d'emails gratuit</li>
                  <li>Les emails ne sont PAS vraiment envoyés aux destinataires</li>
                  <li>Vous pouvez les voir dans les logs du serveur avec des liens de prévisualisation</li>
                  <li>Parfait pour tester sans avoir de SMTP réel</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
