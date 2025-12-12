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
import { Calendar, Clock, User, Phone, Mail, MapPin, Snowflake, Lock, Shield, CheckCircle, Droplet, Coffee, Plus, X } from "lucide-react";
import type { Offer, Syrup, Machine, Booking } from "@shared/schema";
import { calculateRentalDays, calculateBookingTotal } from "@shared/utils";
import BookingDetails from "@/components/booking-details";

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
  bookedMachines: z.array(z.object({
    machineId: z.string(),
    machineName: z.string(),
    quantity: z.number().int().min(1),
  })).min(1, "Sélectionnez au moins une machine"),
  selectedSyrups: z.array(syrupSelectionSchema).optional().default([]),
  cupSize: z.enum(["petit", "moyen", "grand"]).default("moyen"),
  terms: z.boolean().refine(val => val, "Vous devez accepter les conditions"),
});

type BookingFormData = z.infer<typeof bookingSchema>;

type OfferWithPrice = Offer & { amountCents: number; durationType: string };

const DURATION_CONFIG: Record<string, { min: number; max: number; fixed: boolean }> = {
  jour: { min: 1, max: 1, fixed: true },
  weekend: { min: 3, max: 3, fixed: true },
  semaine: { min: 7, max: 7, fixed: true },
  mois: { min: 1, max: 30, fixed: false },
};

// Helper to check if a date is a Friday
const isFriday = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.getDay() === 5; // 5 = Friday
};

// Helper to get next Friday from a date
const getNextFriday = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getDay();
  const daysUntilFriday = (5 - day + 7) % 7;
  if (daysUntilFriday === 0 && day !== 5) {
    date.setDate(date.getDate() + 7);
  } else if (daysUntilFriday > 0) {
    date.setDate(date.getDate() + daysUntilFriday);
  }
  return date.toISOString().split('T')[0];
};

export default function BookingForm() {
  const [machines, setMachines] = useState(1);
  const [selectedOffer, setSelectedOffer] = useState("");
  const [syrupSelections, setSyrupSelections] = useState<{ syrupId: string; quantity: number }[]>([]);
  const [selectedMachines, setSelectedMachines] = useState<{ machineId: string; machineName: string; quantity: number }[]>([]);
  const { toast } = useToast();

  const { data: offers, isLoading: offersLoading } = useQuery<OfferWithPrice[]>({
    queryKey: ['/api/offers'],
  });

  const { data: syrups } = useQuery<Syrup[]>({
    queryKey: ['/api/syrups'],
  });

  const { data: availableMachines } = useQuery<Machine[]>({
    queryKey: ['/api/machines/available'],
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
      bookedMachines: [],
      selectedSyrups: [],
      cupSize: "moyen",
      terms: false,
    },
  });

  // Watch form values for reactive price calculation
  const watchedOffer = form.watch("offer");
  const watchedMachines = form.watch("machines");
  const watchedSyrups = form.watch("selectedSyrups");
  const watchedStartDate = form.watch("startDate");
  const watchedEndDate = form.watch("endDate");
  const watchedCupSize = form.watch("cupSize");

  // Get selected offer's durationType
  const getSelectedOfferDurationType = () => {
    if (!watchedOffer || !offers) return "jour";
    const offer = offers.find(o => o.name === watchedOffer);
    return offer?.durationType || "jour";
  };

  const selectedDurationType = getSelectedOfferDurationType();
  const durationConfig = DURATION_CONFIG[selectedDurationType] || { min: 1, max: 30, fixed: false };
  const isSingleDay = selectedDurationType === "jour";
  const isWeekend = selectedDurationType === "weekend";
  const isFixedDuration = durationConfig.fixed;
  const minDays = durationConfig.min;
  const maxDays = durationConfig.max;

  // Auto-calculate endDate based on durationType when startDate changes
  const calculateAutoEndDate = (startDateStr: string, durationType: string) => {
    if (!startDateStr) return "";
    const config = DURATION_CONFIG[durationType] || { min: 1, max: 30, fixed: false };
    const startDate = new Date(startDateStr);
    const daysToAdd = config.min - 1;
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysToAdd);
    return endDate.toISOString().split('T')[0];
  };

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
      
      // Redirect to confirmation page with Swikly step
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
    
    // Validate endDate for multi-day offers
    if (!isSingleDay && !data.endDate) {
      toast({
        title: "Date de fin requise",
        description: "Veuillez sélectionner une date de fin pour cette offre.",
        variant: "destructive",
      });
      return;
    }

    // Weekend validation: must start on Friday
    if (isWeekend && !isFriday(data.startDate)) {
      toast({
        title: "Date invalide",
        description: "L'offre weekend doit commencer un vendredi.",
        variant: "destructive",
      });
      return;
    }

    // Validate minimum duration based on durationType
    const startDate = new Date(data.startDate);
    const endDateValue = isSingleDay ? startDate : new Date(data.endDate!);
    
    // Calculate days difference: inclusive count (end - start + 1 day)
    const startMs = new Date(data.startDate).setHours(0, 0, 0, 0);
    const endMs = isSingleDay ? startMs : new Date(data.endDate!).setHours(0, 0, 0, 0);
    const daysDiff = Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1;
    
    // For multi-day offers, ensure end date is after start date
    if (!isSingleDay && endMs < startMs) {
      toast({
        title: "Dates invalides",
        description: "La date de fin doit être après la date de début.",
        variant: "destructive",
      });
      return;
    }
    
    if (daysDiff < minDays) {
      toast({
        title: "Durée insuffisante",
        description: `Cette offre nécessite une durée minimum de ${minDays} jour${minDays > 1 ? 's' : ''}.`,
        variant: "destructive",
      });
      return;
    }

    // Max days validation (for mois offer)
    if (daysDiff > maxDays) {
      toast({
        title: "Durée trop longue",
        description: `Cette offre est limitée à ${maxDays} jours maximum.`,
        variant: "destructive",
      });
      return;
    }

    // Pour les offres "jour", endDate = startDate
    const finalEndDate = isSingleDay ? data.startDate : data.endDate!;
    bookingMutation.mutate({ 
      ...bookingData, 
      endDate: finalEndDate,
      machines: data.machines,
      bookedMachines: data.bookedMachines
    });
  };

  const addMachine = (machineId: string) => {
    if (!availableMachines) return;
    
    const machine = availableMachines.find(m => m.id === machineId);
    if (!machine) return;
    
    const existingSelection = selectedMachines.find(m => m.machineId === machineId);
    let updatedSelections: typeof selectedMachines;
    
    if (existingSelection) {
      // Increment quantity if machine already selected
      const maxQuantity = machine.quantity || 1;
      if (existingSelection.quantity >= maxQuantity) {
        toast({
          title: "Quantité maximale atteinte",
          description: `Vous ne pouvez pas réserver plus de ${maxQuantity} unité(s) de cette machine.`,
          variant: "destructive",
        });
        return;
      }
      updatedSelections = selectedMachines.map(m => 
        m.machineId === machineId 
          ? { ...m, quantity: m.quantity + 1 }
          : m
      );
    } else {
      // Add new machine with quantity 1
      const newSelection = { machineId: machine.id, machineName: machine.name, quantity: 1 };
      updatedSelections = [...selectedMachines, newSelection];
    }
    
    // Calculate total machine count
    const totalMachines = updatedSelections.reduce((sum, m) => sum + m.quantity, 0);
    
    setSelectedMachines(updatedSelections);
    form.setValue("bookedMachines", updatedSelections);
    form.setValue("machines", totalMachines);
  };

  const removeMachine = (machineId: string) => {
    const updatedSelections = selectedMachines.filter(m => m.machineId !== machineId);
    const totalMachines = updatedSelections.reduce((sum, m) => sum + m.quantity, 0);
    
    setSelectedMachines(updatedSelections);
    form.setValue("bookedMachines", updatedSelections);
    form.setValue("machines", totalMachines || 1);
  };

  const updateMachineQuantity = (machineId: string, newQuantity: number) => {
    if (!availableMachines) return;
    
    const machine = availableMachines.find(m => m.id === machineId);
    if (!machine) return;
    
    const maxQuantity = machine.quantity || 1;
    
    if (newQuantity < 1) {
      removeMachine(machineId);
      return;
    }
    
    if (newQuantity > maxQuantity) {
      toast({
        title: "Quantité maximale atteinte",
        description: `Vous ne pouvez pas réserver plus de ${maxQuantity} unité(s) de cette machine.`,
        variant: "destructive",
      });
      return;
    }
    
    const updatedSelections = selectedMachines.map(m => 
      m.machineId === machineId 
        ? { ...m, quantity: newQuantity }
        : m
    );
    
    const totalMachines = updatedSelections.reduce((sum, m) => sum + m.quantity, 0);
    
    setSelectedMachines(updatedSelections);
    form.setValue("bookedMachines", updatedSelections);
    form.setValue("machines", totalMachines);
  };

  const calculateRentalDaysForForm = () => {
    if (!watchedStartDate || watchedStartDate === "") return minDays;
    
    const startDate = new Date(watchedStartDate);
    // Pour les offres "jour", endDate = startDate
    const endDateValue = isSingleDay ? watchedStartDate : watchedEndDate;
    if (!endDateValue || endDateValue === "") return minDays;
    
    const endDate = new Date(endDateValue);
    const actualDays = calculateRentalDays(startDate, endDate);
    return Math.max(actualDays, minDays);
  };

  const calculateTotalPrice = () => {
    if (!watchedOffer || !offers) return 0;
    const offer = offers.find(o => o.name === watchedOffer);
    if (!offer) return 0;
    
    // Calculate rental days
    const rentalDays = calculateRentalDaysForForm();
    
    // Calculate syrup total
    let syrupTotalCents = 0;
    if (syrups && watchedSyrups && watchedSyrups.length > 0) {
      watchedSyrups.forEach(selection => {
        const syrup = syrups.find(s => s.id === selection.syrupId);
        if (syrup && syrup.amountCents > 0) {
          syrupTotalCents += syrup.amountCents * selection.quantity;
        }
      });
    }
    
    // Calculate total: (daily price × machines × days) + syrups
    const totalCents = calculateBookingTotal(
      offer.amountCents, // daily price per machine
      watchedMachines,
      rentalDays,
      syrupTotalCents
    );
    
    return totalCents / 100;
  };

  const calculateSyrupsTotalPrice = () => {
    if (!syrups || !watchedSyrups || watchedSyrups.length === 0) return 0;
    
    let total = 0;
    watchedSyrups.forEach(selection => {
      const syrup = syrups.find(s => s.id === selection.syrupId);
      if (syrup && syrup.amountCents > 0) {
        total += syrup.amountCents * selection.quantity;
      }
    });
    
    return total / 100;
  };

  const totalPrice = calculateTotalPrice();
  const syrupsTotalPrice = calculateSyrupsTotalPrice();
  const rentalDays = calculateRentalDaysForForm();
  
  // Format dates for display
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
                      value={field.value}
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
                        {isSingleDay ? "Date de location" : "Date de début"}
                        {isWeekend && (
                          <span className="ml-2 text-xs text-orange-600 font-normal">
                            (vendredi uniquement)
                          </span>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          className="booking-form-input"
                          data-testid="input-start-date"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            if (!isSingleDay && e.target.value) {
                              const suggestedEndDate = calculateAutoEndDate(e.target.value, selectedDurationType);
                              form.setValue("endDate", suggestedEndDate);
                            }
                          }}
                        />
                      </FormControl>
                      {isWeekend && watchedStartDate && !isFriday(watchedStartDate) && (
                        <p className="text-xs text-orange-600 mt-1">
                          Attention: La date sélectionnée n'est pas un vendredi
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedOffer && !isSingleDay && (
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center text-sm font-semibold text-foreground">
                          <Calendar className="w-4 h-4 text-primary mr-2" />
                          Date de fin
                          {isFixedDuration ? (
                            <span className="ml-2 text-xs text-muted-foreground font-normal">
                              (fixée à {minDays} jour{minDays > 1 ? 's' : ''})
                            </span>
                          ) : (
                            <span className="ml-2 text-xs text-muted-foreground font-normal">
                              (max. {maxDays} jours)
                            </span>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            className="booking-form-input"
                            data-testid="input-end-date"
                            min={watchedStartDate ? calculateAutoEndDate(watchedStartDate, selectedDurationType) : undefined}
                            max={watchedStartDate && !isFixedDuration ? (() => {
                              const maxDate = new Date(watchedStartDate);
                              maxDate.setDate(maxDate.getDate() + maxDays - 1);
                              return maxDate.toISOString().split('T')[0];
                            })() : undefined}
                            disabled={isFixedDuration}
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
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
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
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
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

              {/* Machine Selection */}
              <div>
                <Label className="flex items-center text-sm font-semibold text-foreground mb-3">
                  <Snowflake className="w-4 h-4 text-primary mr-2" />
                  Machines sélectionnées (Total: {selectedMachines.reduce((sum, m) => sum + m.quantity, 0)})
                </Label>
                
                {/* Selected Machines Display */}
                {selectedMachines.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {selectedMachines.map((machine) => {
                      const availableMachine = availableMachines?.find(m => m.id === machine.machineId);
                      const maxQuantity = availableMachine?.quantity || 1;
                      
                      return (
                        <div 
                          key={machine.machineId} 
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          data-testid={`selected-machine-${machine.machineId}`}
                        >
                          <div className="flex-1">
                            <span className="font-medium">{machine.machineName}</span>
                            <p className="text-xs text-muted-foreground mt-1">
                              Max disponible: {maxQuantity}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateMachineQuantity(machine.machineId, machine.quantity - 1)}
                              disabled={machine.quantity <= 1}
                              data-testid={`button-decrement-${machine.machineId}`}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              value={machine.quantity}
                              onChange={(e) => updateMachineQuantity(machine.machineId, parseInt(e.target.value) || 1)}
                              className="w-16 text-center"
                              min="1"
                              max={maxQuantity}
                              data-testid={`input-quantity-${machine.machineId}`}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => updateMachineQuantity(machine.machineId, machine.quantity + 1)}
                              disabled={machine.quantity >= maxQuantity}
                              data-testid={`button-increment-${machine.machineId}`}
                            >
                              +
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMachine(machine.machineId)}
                              data-testid={`button-remove-machine-${machine.machineId}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Available Machines Dropdown */}
                {availableMachines && availableMachines.length > 0 && (
                  <div>
                    <Select onValueChange={addMachine} value="">
                      <SelectTrigger className="booking-form-input" data-testid="select-add-machine">
                        <SelectValue placeholder="Ajouter une machine..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMachines.map((machine) => (
                          <SelectItem 
                            key={machine.id} 
                            value={machine.id}
                            data-testid={`option-machine-${machine.id}`}
                          >
                            {machine.name} (Max: {machine.quantity || 1})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                {selectedMachines.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Sélectionnez au moins une machine pour continuer
                  </p>
                )}
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
                      value={field.value}
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
                        placeholder="Ex: 0691 24 32 46"
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

              {/* Booking Summary - Using BookingDetails component */}
              {watchedOffer && watchedStartDate && selectedMachines.length > 0 && (
                (() => {
                  // Create a temporary booking object for preview
                  const watchedStartHour = form.watch("startHour");
                  const watchedEndHour = form.watch("endHour");
                  const watchedCustomerName = form.watch("customerName");
                  const watchedCustomerPhone = form.watch("customerPhone");
                  const watchedCustomerEmail = form.watch("customerEmail");
                  const watchedCustomerAddress = form.watch("customerAddress");
                  
                  const tempBooking: Booking = {
                    id: "temp-preview",
                    offer: watchedOffer,
                    startDate: new Date(watchedStartDate),
                    endDate: isSingleDay ? new Date(watchedStartDate) : (watchedEndDate ? new Date(watchedEndDate) : new Date(watchedStartDate)),
                    startHour: watchedStartHour,
                    endHour: watchedEndHour,
                    customerName: watchedCustomerName || "À compléter",
                    customerPhone: watchedCustomerPhone || "À compléter",
                    customerEmail: watchedCustomerEmail || "À compléter",
                    customerAddress: watchedCustomerAddress || "À compléter",
                    machines: watchedMachines,
                    bookedMachines: selectedMachines,
                    selectedSyrups: watchedSyrups || [],
                    cupSize: watchedCupSize || "moyen",
                    totalCents: Math.round(totalPrice * 100),
                    status: "PENDING",
                    paymentStatus: "PENDING",
                    depositStatus: "PENDING",
                    stripePaymentIntentId: null,
                    swiklyRequestId: null,
                    swiklyUrl: null,
                    stripePaymentId: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                  };
                  
                  return <BookingDetails booking={tempBooking} showTotal={true} />;
                })()
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
                        J'accepte les <a href="/legal/terms" className="text-primary hover:underline">conditions générales</a> et comprends qu'une caution de 150€ par machine sera bloquée via Swikly (aucun débit effectué).
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
          Besoin d'aide ? Contactez-nous au <a href="tel:+590691243246" className="text-primary font-semibold hover:underline">0691 24 32 46</a>
        </p>
      </div>
    </div>
  );
}
