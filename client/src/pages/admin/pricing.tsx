import { useQuery, useMutation } from "@tanstack/react-query";
import AdminNav from "@/components/admin-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DollarSign, Edit, Trash, Plus, X } from "lucide-react";
import type { Machine } from "@shared/schema";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useAdminAuth } from "@/hooks/use-admin-auth";

type OfferWithPricing = {
  id: string;
  name: string;
  description: string | null;
  basePriceCents: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  machinePriceOverrides: Array<{
    id: string;
    offerId: string;
    machineId: string;
    amountCents: number;
    createdAt: string;
    updatedAt: string;
  }>;
};

type MachinePriceOverride = {
  machineId: string;
  amountCents: number;
};

export default function AdminPricing() {
  useAdminAuth();

  const { toast } = useToast();
  
  // Form states
  const [editingOffer, setEditingOffer] = useState<OfferWithPricing | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [offerName, setOfferName] = useState("");
  const [offerDescription, setOfferDescription] = useState("");
  const [basePriceEuros, setBasePriceEuros] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [machinePriceOverrides, setMachinePriceOverrides] = useState<MachinePriceOverride[]>([]);

  const { data: offers, isLoading } = useQuery<OfferWithPricing[]>({
    queryKey: ['/api/admin/offers'],
  });

  const { data: machines } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      description?: string;
      basePriceCents: number;
      active: boolean;
      machinePriceOverrides?: MachinePriceOverride[];
    }) => {
      const response = await apiRequest('POST', '/api/admin/offers', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: "Offre créée",
        description: "L'offre a été créée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer l'offre",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      description?: string;
      basePriceCents?: number;
      active?: boolean;
      machinePriceOverrides?: MachinePriceOverride[];
    }) => {
      const { id, ...updates } = data;
      const response = await apiRequest('PATCH', `/api/admin/offers/${id}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      setIsDialogOpen(false);
      setEditingOffer(null);
      resetForm();
      toast({
        title: "Offre mise à jour",
        description: "L'offre a été mise à jour avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour l'offre",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/offers/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      toast({
        title: "Offre supprimée",
        description: "L'offre a été supprimée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'offre",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const response = await apiRequest('PATCH', `/api/admin/offers/${id}`, { active });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      toast({
        title: "Statut modifié",
        description: "Le statut de l'offre a été modifié avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de modifier le statut",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setOfferName("");
    setOfferDescription("");
    setBasePriceEuros("");
    setIsActive(true);
    setMachinePriceOverrides([]);
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingOffer(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (offer: OfferWithPricing) => {
    setEditingOffer(offer);
    setOfferName(offer.name);
    setOfferDescription(offer.description || "");
    setBasePriceEuros((offer.basePriceCents / 100).toString());
    setIsActive(offer.active);
    setMachinePriceOverrides(
      offer.machinePriceOverrides.map(override => ({
        machineId: override.machineId,
        amountCents: override.amountCents,
      }))
    );
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const basePriceCents = Math.round(parseFloat(basePriceEuros) * 100);

    if (isNaN(basePriceCents) || basePriceCents < 0) {
      toast({
        title: "Erreur",
        description: "Le prix de base doit être un nombre positif",
        variant: "destructive",
      });
      return;
    }

    const data = {
      name: offerName.trim(),
      description: offerDescription.trim() || undefined,
      basePriceCents,
      active: isActive,
      machinePriceOverrides: machinePriceOverrides.filter(o => o.machineId && o.amountCents >= 0),
    };

    if (editingOffer) {
      updateMutation.mutate({ id: editingOffer.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const addMachineOverride = () => {
    setMachinePriceOverrides([...machinePriceOverrides, { machineId: "", amountCents: 0 }]);
  };

  const removeMachineOverride = (index: number) => {
    setMachinePriceOverrides(machinePriceOverrides.filter((_, i) => i !== index));
  };

  const updateMachineOverride = (index: number, field: "machineId" | "amountCents", value: string | number) => {
    const newOverrides = [...machinePriceOverrides];
    if (field === "machineId") {
      newOverrides[index].machineId = value as string;
    } else {
      newOverrides[index].amountCents = typeof value === 'number' ? value : Math.round(parseFloat(value as string) * 100);
    }
    setMachinePriceOverrides(newOverrides);
  };

  const getMachineName = (machineId: string) => {
    return machines?.find(m => m.id === machineId)?.name || machineId;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <main className="container mx-auto py-8 px-4">
          <p>Chargement...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <main className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Gestion des Offres & Prix</h1>
            <p className="text-muted-foreground mt-2">
              Gérez les offres avec leurs prix de base et surcharges par machine
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} data-testid="button-create-offer">
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle Offre
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingOffer ? "Modifier l'offre" : "Créer une nouvelle offre"}
                </DialogTitle>
                <DialogDescription>
                  {editingOffer
                    ? "Modifiez les informations de l'offre, son prix de base et ses surcharges par machine"
                    : "Créez une nouvelle offre avec un prix de base et des surcharges optionnelles par machine"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nom de l'offre *</Label>
                    <Input
                      id="name"
                      value={offerName}
                      onChange={(e) => setOfferName(e.target.value)}
                      placeholder="Ex: 1 Journée, Week-end, Événement"
                      required
                      data-testid="input-offer-name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={offerDescription}
                      onChange={(e) => setOfferDescription(e.target.value)}
                      placeholder="Description de l'offre (optionnel)"
                      data-testid="input-offer-description"
                    />
                  </div>

                  <div>
                    <Label htmlFor="basePrice">Prix de base (€) *</Label>
                    <Input
                      id="basePrice"
                      type="number"
                      step="0.01"
                      value={basePriceEuros}
                      onChange={(e) => setBasePriceEuros(e.target.value)}
                      placeholder="Ex: 150"
                      required
                      data-testid="input-base-price"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={isActive}
                      onCheckedChange={setIsActive}
                      data-testid="switch-active"
                    />
                    <Label htmlFor="active">Offre active</Label>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Surcharges par machine</h3>
                      <p className="text-sm text-muted-foreground">
                        Optionnel : définissez des prix spécifiques pour certaines machines
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addMachineOverride}
                      data-testid="button-add-override"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter
                    </Button>
                  </div>

                  {machinePriceOverrides.length > 0 && (
                    <div className="space-y-3">
                      {machinePriceOverrides.map((override, index) => (
                        <div key={index} className="flex gap-3 items-end">
                          <div className="flex-1">
                            <Label>Machine</Label>
                            <Select
                              value={override.machineId}
                              onValueChange={(value) => updateMachineOverride(index, "machineId", value)}
                            >
                              <SelectTrigger data-testid={`select-machine-${index}`}>
                                <SelectValue placeholder="Sélectionner une machine" />
                              </SelectTrigger>
                              <SelectContent>
                                {machines?.map((machine) => (
                                  <SelectItem key={machine.id} value={machine.id}>
                                    {machine.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Label>Prix (€)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={(override.amountCents / 100).toString()}
                              onChange={(e) => updateMachineOverride(index, "amountCents", e.target.value)}
                              placeholder="Ex: 200"
                              data-testid={`input-price-${index}`}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMachineOverride(index)}
                            data-testid={`button-remove-override-${index}`}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    data-testid="button-submit"
                  >
                    {editingOffer ? "Mettre à jour" : "Créer"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Offre</TableHead>
                  <TableHead>Prix de base</TableHead>
                  <TableHead>Surcharges machines</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers?.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium" data-testid={`text-offer-name-${offer.id}`}>
                          {offer.name}
                        </p>
                        {offer.description && (
                          <p className="text-sm text-muted-foreground">{offer.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        <span data-testid={`text-base-price-${offer.id}`}>
                          {(offer.basePriceCents / 100).toFixed(2)} €
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {offer.machinePriceOverrides.length > 0 ? (
                        <div className="space-y-1">
                          {offer.machinePriceOverrides.map((override) => (
                            <div key={override.id} className="text-sm">
                              {getMachineName(override.machineId)}: {(override.amountCents / 100).toFixed(2)} €
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Aucune</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={offer.active}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: offer.id, active: checked })
                          }
                          data-testid={`switch-active-${offer.id}`}
                        />
                        <Badge variant={offer.active ? "default" : "secondary"}>
                          {offer.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(offer)}
                          data-testid={`button-edit-${offer.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Êtes-vous sûr de vouloir supprimer l'offre "${offer.name}" ?`)) {
                              deleteMutation.mutate(offer.id);
                            }
                          }}
                          data-testid={`button-delete-${offer.id}`}
                        >
                          <Trash className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!offers || offers.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Aucune offre configurée. Créez votre première offre pour commencer.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
