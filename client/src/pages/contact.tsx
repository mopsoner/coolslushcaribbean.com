import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Mail, Phone, MapPin, Send, CheckCircle } from "lucide-react";

const contactSchema = z.object({
  name: z.string().min(2, "Nom requis (min. 2 caractères)"),
  email: z.string().email("Email valide requis"),
  phone: z.string().optional(),
  subject: z.string().min(1, "Veuillez sélectionner un sujet"),
  message: z.string().min(10, "Message requis (min. 10 caractères)"),
  website: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function Contact() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
      website: "",
    },
  });

  const contactMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      const response = await apiRequest("POST", "/api/contact", data);
      return response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Message envoyé !",
        description: "Nous vous répondrons dans les plus brefs délais.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContactFormData) => {
    contactMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800">
      <Navbar />

      <main className="py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">
              Contactez-nous
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Vous avez une demande spéciale ou une question ? N'hésitez pas à nous contacter.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <Card className="shadow-xl border-0">
              <CardHeader className="gradient-tropical text-white rounded-t-lg">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Mail className="w-6 h-6" />
                  Envoyez-nous un message
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                {isSubmitted ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      Message envoyé avec succès !
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 mb-6">
                      Nous avons bien reçu votre message et nous vous répondrons dans les plus brefs délais.
                    </p>
                    <Button
                      onClick={() => {
                        setIsSubmitted(false);
                        form.reset();
                      }}
                      variant="outline"
                      data-testid="button-send-another"
                    >
                      Envoyer un autre message
                    </Button>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nom complet *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Votre nom"
                                data-testid="input-contact-name"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email *</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="votre@email.com"
                                  data-testid="input-contact-email"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Téléphone</FormLabel>
                              <FormControl>
                                <Input
                                  type="tel"
                                  placeholder="0691 XX XX XX"
                                  data-testid="input-contact-phone"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sujet *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-contact-subject">
                                  <SelectValue placeholder="Sélectionnez un sujet" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="special_request">Demande spéciale</SelectItem>
                                <SelectItem value="quote">Demande de devis</SelectItem>
                                <SelectItem value="event">Événement particulier</SelectItem>
                                <SelectItem value="question">Question générale</SelectItem>
                                <SelectItem value="other">Autre</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Message *</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Décrivez votre demande en détail..."
                                className="min-h-[150px]"
                                data-testid="input-contact-message"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="website"
                        render={({ field }) => (
                          <FormItem className="absolute -left-[9999px] opacity-0 h-0 overflow-hidden" aria-hidden="true">
                            <FormLabel>Website</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                tabIndex={-1}
                                autoComplete="off"
                                {...field}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <Button
                        type="submit"
                        className="w-full gradient-tropical text-white py-6 text-lg font-semibold"
                        disabled={contactMutation.isPending}
                        data-testid="button-submit-contact"
                      >
                        {contactMutation.isPending ? (
                          "Envoi en cours..."
                        ) : (
                          <>
                            <Send className="w-5 h-5 mr-2" />
                            Envoyer le message
                          </>
                        )}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>

            <div className="space-y-8">
              <Card className="shadow-lg border-0">
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">
                    Nos coordonnées
                  </h3>
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 gradient-tropical rounded-lg flex items-center justify-center flex-shrink-0">
                        <Phone className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">Téléphone</h4>
                        <a
                          href="tel:+590691243246"
                          className="text-primary hover:underline"
                          data-testid="link-phone"
                        >
                          0691 24 32 46
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 gradient-tropical rounded-lg flex items-center justify-center flex-shrink-0">
                        <Mail className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">Email</h4>
                        <a
                          href="mailto:contact@coolslushlemonade.com"
                          className="text-primary hover:underline"
                          data-testid="link-email"
                        >
                          contact@coolslushlemonade.com
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 gradient-tropical rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">Zone de service</h4>
                        <p className="text-slate-600 dark:text-slate-300">
                          Guadeloupe
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-gradient-to-br from-cyan-50 to-orange-50 dark:from-slate-800 dark:to-slate-700">
                <CardContent className="p-8">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                    Demandes spéciales
                  </h3>
                  <p className="text-slate-600 dark:text-slate-300 mb-4">
                    Vous organisez un événement particulier ? Nous pouvons adapter notre offre à vos besoins :
                  </p>
                  <ul className="space-y-2 text-slate-600 dark:text-slate-300">
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      Location longue durée
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      Événements professionnels
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      Mariages et fêtes privées
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-primary rounded-full"></span>
                      Festivals et marchés
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
