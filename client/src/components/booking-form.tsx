import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, User, Phone, Mail, MapPin, Snowflake, Lock, Shield, CheckCircle, Droplet, Coffee } from "lucide-react";
import type { Offer, Syrup } from "@shared/schema";

const syrupSelectionSchema = z.object({
  syrupId: z.string(),
  quantity: z.number().int().min(1).max(10),
});

const bookingSchema = z.object({
  offer: z.string().min(1, "Veuillez sélectionner une offre"),
  startDate: z.string().min(1, "Date de début requise"),
  endDate: z.string().optional(),
  startHour: z.number().min(0).max(23),
  endHour: z.number().min(1).max(24),
  customerName: z.string().min(2, "Nom requis (min. 2 caractères)"),
  customerPhone: z.string().min(6, "Téléphone requis"),
  customerEmail: z.string().email("Email valide requis"),
  customerAddress: z.string().min(5, "Adresse requise (min. 5 caractères)"),
  machines: z.number().min(1).max(10),
  selectedSyrups: z.array(syrupSelectionSchema).optional().default([]),
  cupSize: z.enum(["petit", "moyen", "grand"]).default("moyen"),
  terms: z.boolean().refine(val => val, "Vous devez accepter les conditions"),
}).refine((data) => {
  // Pour les offres multi-jours, endDate est obligatoire
  if (data.offer !== "1 Journée" && !data.endDate) {
    return false;
  }
  return true;
}, {
  message: "Date de fin requise pour cette offre",
  path: ["endDate"],
});

type BookingFormData = z.infer<typeof bookingSchema>;

type OfferWithPrice = Offer & { amountCents: number };

export default function BookingForm() {
  const [machines, setMachines] = useState(1);
  const [selectedOffer, setSelectedOffer] = useState("");
  const [syrupSelections, setSyrupSelections] = useState<{ syrupId: string; quantity: number }[]>([]);
  const { toast } = useToast();

  const { data: offers, isLoading: offersLoading } = useQuery<OfferWithPrice[]>({
    queryKey: ['/api/offers'],
  });

  const { data: syrups } = useQuery<Syrup[]>({
    queryKey: ['/api/syrups'],
  });
  
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
      customerAddress: "",
      machines: 1,
      selectedSyrups: [],
      cupSize: "moyen",
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
    const endDate = data.offer === "1 Journée" ? data.startDate : data.endDate!;
    bookingMutation.mutate({ 
      ...bookingData, 
      endDate,
      machines: data.machines
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

  const calculateTotalPrice = () => {
    if (!selectedOffer || !offers) return 0;
    const offer = offers.find(o => o.name === selectedOffer);
    if (!offer) return 0;
    return (offer.amountCents * machines) / 100;
  };

  const totalPrice = calculateTotalPrice();

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
                        {offers?.map((offer) => (
                          <SelectItem key={offer.id} value={offer.name} data-testid={`option-offer-${offer.id}`}>
                            {offer.name} - {offer.amountCents > 0 ? `${(offer.amountCents / 100).toFixed(0)}€/machine` : 'Sur devis'}
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

              {/* Cup Size */}
              <FormField
                control={form.control}
                name="cupSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center text-sm font-semibold text-foreground">
                      <Coffee className="w-4 h-4 text-primary mr-2" />
                      Taille des gobelets
                    </FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="booking-form-input" data-testid="select-cup-size">
                          <SelectValue placeholder="Sélectionner la taille" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="petit" data-testid="option-cup-petit">Petit (250ml)</SelectItem>
                        <SelectItem value="moyen" data-testid="option-cup-moyen">Moyen (350ml)</SelectItem>
                        <SelectItem value="grand" data-testid="option-cup-grand">Grand (500ml)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Syrups Selection */}
              {syrups && syrups.length > 0 && (
                <div>
                  <Label className="flex items-center text-sm font-semibold text-foreground mb-3">
                    <Droplet className="w-4 h-4 text-primary mr-2" />
                    Sirops (optionnel)
                  </Label>
                  <div className="space-y-2">
                    {syrups.map((syrup) => {
                      const selection = syrupSelections.find(s => s.syrupId === syrup.id);
                      const quantity = selection?.quantity || 0;
                      
                      return (
                        <div key={syrup.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{syrup.name}</p>
                            {syrup.amountCents > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {(syrup.amountCents / 100).toFixed(2)} € / unité
                              </p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (quantity > 0) {
                                  const newQuantity = quantity - 1;
                                  if (newQuantity === 0) {
                                    const newSelections = syrupSelections.filter(s => s.syrupId !== syrup.id);
                                    setSyrupSelections(newSelections);
                                    form.setValue("selectedSyrups", newSelections);
                                  } else {
                                    const newSelections = syrupSelections.map(s => 
                                      s.syrupId === syrup.id ? { ...s, quantity: newQuantity } : s
                                    );
                                    setSyrupSelections(newSelections);
                                    form.setValue("selectedSyrups", newSelections);
                                  }
                                }
                              }}
                              disabled={quantity === 0}
                              data-testid={`button-decrease-syrup-${syrup.id}`}
                            >
                              -
                            </Button>
                            <span className="w-8 text-center font-medium" data-testid={`quantity-syrup-${syrup.id}`}>
                              {quantity}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const newQuantity = quantity + 1;
                                const existingIndex = syrupSelections.findIndex(s => s.syrupId === syrup.id);
                                let newSelections;
                                if (existingIndex >= 0) {
                                  newSelections = syrupSelections.map(s => 
                                    s.syrupId === syrup.id ? { ...s, quantity: newQuantity } : s
                                  );
                                } else {
                                  newSelections = [...syrupSelections, { syrupId: syrup.id, quantity: newQuantity }];
                                }
                                setSyrupSelections(newSelections);
                                form.setValue("selectedSyrups", newSelections);
                              }}
                              disabled={quantity >= 10}
                              data-testid={`button-increase-syrup-${syrup.id}`}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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

              <FormField
                control={form.control}
                name="customerAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center text-sm font-semibold text-foreground">
                      <MapPin className="w-4 h-4 text-primary mr-2" />
                      Adresse
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: 123 Rue de la Plage, Pointe-à-Pitre"
                        className="booking-form-input"
                        data-testid="input-customer-address"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Price Summary */}
              {selectedOffer && totalPrice > 0 && (
                <div className="bg-primary/10 rounded-xl p-6 border border-primary/20" data-testid="price-summary">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-muted-foreground">Prix estimé</p>
                      <p className="text-xs text-muted-foreground mt-1">{machines} machine(s) × {(totalPrice / machines).toFixed(0)}€</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-primary" data-testid="total-price">
                        {totalPrice.toFixed(2)} €
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">TTC</p>
                    </div>
                  </div>
                </div>
              )}

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
                        J'accepte les <a href="/legal/terms" className="text-primary hover:underline">conditions générales</a> et comprends qu'une caution de 1€ sera bloquée via Swikly (aucun débit effectué).
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
