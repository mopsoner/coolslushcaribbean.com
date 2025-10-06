import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, User, Phone, Mail, Snowflake, Lock, Shield, CheckCircle } from "lucide-react";

const bookingSchema = z.object({
  offer: z.string().min(1, "Veuillez sélectionner une offre"),
  startDate: z.string().min(1, "Date de début requise"),
  endDate: z.string().optional(),
  startHour: z.number().min(0).max(23),
  endHour: z.number().min(1).max(24),
  customerName: z.string().min(2, "Nom requis (min. 2 caractères)"),
  customerPhone: z.string().min(6, "Téléphone requis"),
  customerEmail: z.string().email("Email valide requis"),
  machines: z.number().min(1).max(10),
  terms: z.boolean().refine(val => val, "Vous devez accepter les conditions"),
});

type BookingFormData = z.infer<typeof bookingSchema>;

const offers = [
  { value: "1 Journée", label: "1 Journée - 90€/machine", price: 9000 },
  { value: "Week-end", label: "Week-end - 160€/machine", price: 16000 },
  { value: "Événement", label: "Événement - Sur devis", price: 0 },
];

export default function BookingForm() {
  const [machines, setMachines] = useState(1);
  const [selectedOffer, setSelectedOffer] = useState("");
  const { toast } = useToast();
  
  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      offer: "",
      startDate: "",
      endDate: "",
      startHour: 10,
      endHour: 18,
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      machines: 1,
      terms: false,
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async (data: Omit<BookingFormData, "terms">) => {
      const response = await apiRequest("POST", "/api/bookings", data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Réservation confirmée !",
        description: "Vérifiez votre email pour la caution Swikly...",
      });
      
      // Redirect to confirmation page instead of directly to Swikly
      if (data.bookingId) {
        window.location.href = `/booking-confirmation?booking=${data.bookingId}`;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BookingFormData) => {
    const { terms, ...bookingData } = data;
    // Pour "1 Journée", endDate = startDate
    const endDate = data.offer === "1 Journée" ? data.startDate : (data.endDate || data.startDate);
    bookingMutation.mutate({ 
      ...bookingData, 
      endDate,
      machines 
    });
  };

  const incrementMachines = () => {
    if (machines < 10) {
      const newCount = machines + 1;
      setMachines(newCount);
      form.setValue("machines", newCount);
    }
  };

  const decrementMachines = () => {
    if (machines > 1) {
      const newCount = machines - 1;
      setMachines(newCount);
      form.setValue("machines", newCount);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="shadow-2xl border-0 overflow-hidden">
        <CardHeader className="gradient-tropical text-center text-white p-12">
          <Calendar className="w-16 h-16 mx-auto mb-4" />
          <CardTitle className="text-3xl md:text-4xl font-bold mb-3">
            Réserver votre machine
          </CardTitle>
          <p className="text-lg text-white/90">
            Remplissez le formulaire et recevez votre lien de caution Swikly par email
          </p>
        </CardHeader>

        <CardContent className="p-8 md:p-12">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Offer Selection */}
              <FormField
                control={form.control}
                name="offer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center text-sm font-semibold text-foreground">
                      <Snowflake className="w-4 h-4 text-primary mr-2" />
                      Type d'offre
                    </FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedOffer(value);
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="booking-form-input" data-testid="select-offer">
                          <SelectValue placeholder="Choisissez votre offre" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {offers.map((offer) => (
                          <SelectItem key={offer.value} value={offer.value}>
                            {offer.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date Selection - Conditional based on offer */}
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center text-sm font-semibold text-foreground">
                        <Calendar className="w-4 h-4 text-primary mr-2" />
                        {selectedOffer === "1 Journée" ? "Date de location" : "Date de début"}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="booking-form-input"
                          data-testid="input-start-date"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedOffer && selectedOffer !== "1 Journée" && (
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center text-sm font-semibold text-foreground">
                          <Calendar className="w-4 h-4 text-primary mr-2" />
                          Date de fin
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="booking-form-input"
                            data-testid="input-end-date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Time Range */}
              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startHour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center text-sm font-semibold text-foreground">
                        <Clock className="w-4 h-4 text-primary mr-2" />
                        Heure de début
                      </FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger className="booking-form-input" data-testid="select-start-hour">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 18 }, (_, i) => i + 6).map((hour) => (
                            <SelectItem key={hour} value={hour.toString()}>
                              {hour.toString().padStart(2, '0')}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endHour"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center text-sm font-semibold text-foreground">
                        <Clock className="w-4 h-4 text-primary mr-2" />
                        Heure de fin
                      </FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger className="booking-form-input" data-testid="select-end-hour">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 9 }, (_, i) => i + 14).map((hour) => (
                            <SelectItem key={hour} value={hour.toString()}>
                              {hour.toString().padStart(2, '0')}:00
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Number of Machines */}
              <div>
                <Label className="flex items-center text-sm font-semibold text-foreground mb-2">
                  <Snowflake className="w-4 h-4 text-primary mr-2" />
                  Nombre de machines
                </Label>
                <div className="flex items-center space-x-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="w-12 h-12 rounded-xl"
                    onClick={decrementMachines}
                    disabled={machines <= 1}
                    data-testid="button-decrement-machines"
                  >
                    -
                  </Button>
                  <Input
                    type="number"
                    value={machines}
                    readOnly
                    className="w-20 text-center font-semibold booking-form-input"
                    data-testid="input-machines"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="w-12 h-12 rounded-xl"
                    onClick={incrementMachines}
                    disabled={machines >= 10}
                    data-testid="button-increment-machines"
                  >
                    +
                  </Button>
                  <span className="text-muted-foreground text-sm">machine(s)</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-border my-8"></div>

              {/* Customer Information */}
              <div>
                <h3 className="text-xl font-bold text-foreground mb-4">Vos coordonnées</h3>
              </div>

              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center text-sm font-semibold text-foreground">
                      <User className="w-4 h-4 text-primary mr-2" />
                      Nom complet
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Jean Dupont"
                        className="booking-form-input"
                        data-testid="input-customer-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center text-sm font-semibold text-foreground">
                      <Phone className="w-4 h-4 text-primary mr-2" />
                      Téléphone
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="Ex: 0690 12 34 56"
                        className="booking-form-input"
                        data-testid="input-customer-phone"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center text-sm font-semibold text-foreground">
                      <Mail className="w-4 h-4 text-primary mr-2" />
                      Email
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Ex: jean.dupont@email.com"
                        className="booking-form-input"
                        data-testid="input-customer-email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Terms & Conditions */}
              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem className="bg-muted/50 rounded-xl p-6 border border-border">
                    <div className="flex items-start space-x-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-terms"
                        />
                      </FormControl>
                      <div className="text-sm text-muted-foreground flex-1">
                        J'accepte les <a href="/legal/terms" className="text-primary hover:underline">conditions générales</a> et comprends qu'une caution de 500€ sera bloquée via Swikly (aucun débit effectué).
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full gradient-tropical text-white font-bold text-lg py-4 rounded-2xl hover:shadow-2xl transition-all"
                disabled={bookingMutation.isPending}
                data-testid="button-submit-booking"
              >
                <Lock className="mr-3 w-5 h-5" />
                {bookingMutation.isPending ? "Envoi en cours..." : "Valider ma réservation"}
              </Button>

            </form>
          </Form>
        </CardContent>

        {/* Security Badge */}
        <div className="bg-muted px-8 py-6 border-t border-border">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center" data-testid="security-ssl">
              <Shield className="w-4 h-4 text-primary mr-2" />
              <span>Paiement sécurisé SSL</span>
            </div>
            <div className="flex items-center" data-testid="security-data">
              <Lock className="w-4 h-4 text-primary mr-2" />
              <span>Données protégées</span>
            </div>
            <div className="flex items-center" data-testid="security-confirmation">
              <CheckCircle className="w-4 h-4 text-primary mr-2" />
              <span>Confirmation immédiate</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Additional Info */}
      <div className="mt-8 text-center">
        <p className="text-muted-foreground">
          <Phone className="inline w-4 h-4 text-primary mr-2" />
          Besoin d'aide ? Contactez-nous au <a href="tel:+590690123456" className="text-primary font-semibold hover:underline">0690 12 34 56</a>
        </p>
      </div>
    </div>
  );
}
