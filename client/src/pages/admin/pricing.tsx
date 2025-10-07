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
import { DollarSign, Edit, Trash, Plus } from "lucide-react";
import type { Offer, PriceConfiguration, Machine } from "@shared/schema";
import { useState } from "react";

export default function AdminPricing() {
  const { toast } = useToast();
  const [editingConfig, setEditingConfig] = useState<PriceConfiguration | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string>("");
  const [selectedMachineId, setSelectedMachineId] = useState<string>("");
  const [amountEuros, setAmountEuros] = useState<string>("");
  
  // Offer management states
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isCreateOfferDialogOpen, setIsCreateOfferDialogOpen] = useState(false);
  const [offerName, setOfferName] = useState<string>("");
  const [offerDescription, setOfferDescription] = useState<string>("");

  const { data: offers, isLoading: offersLoading } = useQuery<Offer[]>({
    queryKey: ['/api/admin/offers'],
  });

  const { data: priceConfigs, isLoading: configsLoading } = useQuery<PriceConfiguration[]>({
    queryKey: ['/api/admin/price-configs'],
  });

  const { data: machines } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const createPriceMutation = useMutation({
    mutationFn: async (data: { offerId: string; machineId: string | null; amountCents: number }) => {
      const response = await apiRequest('POST', '/api/admin/price-configs', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/price-configs'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Configuration créée",
        description: "La configuration de prix a été créée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la configuration",
        variant: "destructive",
      });
    },
  });

  const updatePriceMutation = useMutation({
    mutationFn: async (data: { id: string; amountCents: number }) => {
      const response = await apiRequest('PATCH', `/api/admin/price-configs/${data.id}`, { amountCents: data.amountCents });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/price-configs'] });
      setEditingConfig(null);
      resetForm();
      toast({
        title: "Configuration mise à jour",
        description: "La configuration de prix a été mise à jour avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la configuration",
        variant: "destructive",
      });
    },
  });

  const deletePriceMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/price-configs/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/price-configs'] });
      toast({
        title: "Configuration supprimée",
        description: "La configuration de prix a été supprimée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer la configuration",
        variant: "destructive",
      });
    },
  });

  // Offer mutations
  const createOfferMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; active: boolean }) => {
      const response = await apiRequest('POST', '/api/admin/offers', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      setIsCreateOfferDialogOpen(false);
      resetOfferForm();
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

  const updateOfferMutation = useMutation({
    mutationFn: async (data: { id: string; name?: string; description?: string; active?: boolean }) => {
      const response = await apiRequest('PATCH', `/api/admin/offers/${data.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/offers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/offers'] });
      setEditingOffer(null);
      resetOfferForm();
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

  const deleteOfferMutation = useMutation({
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

  const resetForm = () => {
    setSelectedOfferId("");
    setSelectedMachineId("");
    setAmountEuros("");
  };

  const resetOfferForm = () => {
    setOfferName("");
    setOfferDescription("");
  };

  const handleCreate = () => {
    if (!selectedOfferId || !amountEuros) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    const amountCents = Math.round(parseFloat(amountEuros) * 100);
    createPriceMutation.mutate({
      offerId: selectedOfferId,
      machineId: selectedMachineId || null,
      amountCents,
    });
  };

  const handleUpdate = () => {
    if (!editingConfig || !amountEuros) return;

    const amountCents = Math.round(parseFloat(amountEuros) * 100);
    updatePriceMutation.mutate({
      id: editingConfig.id,
      amountCents,
    });
  };

  const openEditDialog = (config: PriceConfiguration) => {
    setEditingConfig(config);
    setAmountEuros((config.amountCents / 100).toFixed(2));
  };

  // Offer handlers
  const handleCreateOffer = () => {
    if (!offerName) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez entrer un nom d'offre",
        variant: "destructive",
      });
      return;
    }

    createOfferMutation.mutate({
      name: offerName,
      description: offerDescription || undefined,
      active: true,
    });
  };

  const handleEditOffer = () => {
    if (!editingOffer) return;

    const updates: any = {};
    if (offerName) updates.name = offerName;
    if (offerDescription !== undefined) updates.description = offerDescription;

    updateOfferMutation.mutate({
      id: editingOffer.id,
      ...updates,
    });
  };

  const toggleOfferActive = (offer: Offer) => {
    updateOfferMutation.mutate({
      id: offer.id,
      active: !offer.active,
    });
  };

  const openEditOfferDialog = (offer: Offer) => {
    setEditingOffer(offer);
    setOfferName(offer.name);
    setOfferDescription(offer.description || "");
  };

  const getOfferName = (offerId: string) => {
    return offers?.find(o => o.id === offerId)?.name || "Inconnu";
  };

  const getMachineName = (machineId: string | null) => {
    if (!machineId) return "Par défaut (toutes les machines)";
    return machines?.find(m => m.id === machineId)?.name || "Machine inconnue";
  };

  if (offersLoading || configsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <div className="h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading" data-testid="loading-pricing" />
        </div>
      </div>
    );
  }

  const totalConfigs = priceConfigs?.length || 0;
  const activeOffers = offers?.filter(o => o.active).length || 0;

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-pricing-title">
                Gestion des prix
              </h1>
              <p className="text-muted-foreground" data-testid="text-pricing-subtitle">
                Configurez les tarifs pour chaque offre et machine
              </p>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-create-price">
                  <Plus className="w-4 h-4" />
                  Nouveau prix
                </Button>
              </DialogTrigger>
              <DialogContent data-testid="dialog-create-price">
                <DialogHeader>
                  <DialogTitle>Créer une configuration de prix</DialogTitle>
                  <DialogDescription>
                    Définissez le prix pour une offre spécifique. Laissez "Machine" vide pour définir un prix par défaut.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="offer">Offre *</Label>
                    <Select value={selectedOfferId} onValueChange={setSelectedOfferId}>
                      <SelectTrigger id="offer" data-testid="select-offer">
                        <SelectValue placeholder="Sélectionner une offre" />
                      </SelectTrigger>
                      <SelectContent>
                        {offers?.map(offer => (
                          <SelectItem key={offer.id} value={offer.id} data-testid={`option-offer-${offer.id}`}>
                            {offer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="machine">Machine (optionnel)</Label>
                    <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
                      <SelectTrigger id="machine" data-testid="select-machine">
                        <SelectValue placeholder="Par défaut (toutes)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="" data-testid="option-machine-default">Par défaut</SelectItem>
                        {machines?.map(machine => (
                          <SelectItem key={machine.id} value={machine.id} data-testid={`option-machine-${machine.id}`}>
                            {machine.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Prix (€) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amountEuros}
                      onChange={(e) => setAmountEuros(e.target.value)}
                      data-testid="input-amount"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleCreate} 
                    disabled={createPriceMutation.isPending}
                    data-testid="button-confirm-create"
                  >
                    {createPriceMutation.isPending ? "Création..." : "Créer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="rounded-2xl shadow-lg border border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium" data-testid="stat-total-configs-label">
                      Configurations de prix
                    </p>
                    <p className="text-3xl font-bold text-foreground" data-testid="stat-total-configs-value">
                      {totalConfigs}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-lg border border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium" data-testid="stat-active-offers-label">
                      Offres actives
                    </p>
                    <p className="text-3xl font-bold text-foreground" data-testid="stat-active-offers-value">
                      {activeOffers}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Offers Management Section */}
          <Card className="rounded-2xl shadow-lg border border-border mb-8">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                  <DollarSign className="w-6 h-6 text-primary mr-2" />
                  <h2 className="text-2xl font-bold">Gestion des offres</h2>
                </div>
                <Dialog open={isCreateOfferDialogOpen} onOpenChange={setIsCreateOfferDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gradient-tropical" data-testid="button-add-offer">
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter une offre
                    </Button>
                  </DialogTrigger>
                  <DialogContent data-testid="dialog-add-offer">
                    <DialogHeader>
                      <DialogTitle>Ajouter une offre</DialogTitle>
                      <DialogDescription>
                        Créez une nouvelle offre avec son nom et sa description
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="offer-name">Nom de l'offre *</Label>
                        <Input
                          id="offer-name"
                          placeholder="Ex: 1 Journée, Week-end..."
                          value={offerName}
                          onChange={(e) => setOfferName(e.target.value)}
                          data-testid="input-offer-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="offer-description">Description (optionnel)</Label>
                        <Input
                          id="offer-description"
                          placeholder="Description de l'offre..."
                          value={offerDescription}
                          onChange={(e) => setOfferDescription(e.target.value)}
                          data-testid="input-offer-description"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleCreateOffer}
                        disabled={createOfferMutation.isPending}
                        data-testid="button-save-offer"
                      >
                        {createOfferMutation.isPending ? "Création..." : "Créer"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offers?.map((offer) => (
                    <TableRow key={offer.id} data-testid={`row-offer-${offer.id}`}>
                      <TableCell className="font-medium">{offer.name}</TableCell>
                      <TableCell className="text-muted-foreground">{offer.description || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={offer.active ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => toggleOfferActive(offer)}
                          data-testid={`badge-offer-status-${offer.id}`}
                        >
                          {offer.active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Dialog open={editingOffer?.id === offer.id} onOpenChange={(open) => !open && setEditingOffer(null)}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditOfferDialog(offer)}
                                data-testid={`button-edit-offer-${offer.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Modifier l'offre</DialogTitle>
                                <DialogDescription>
                                  Modifiez le nom ou la description de l'offre
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div>
                                  <Label htmlFor="edit-offer-name">Nom de l'offre</Label>
                                  <Input
                                    id="edit-offer-name"
                                    value={offerName}
                                    onChange={(e) => setOfferName(e.target.value)}
                                    data-testid="input-edit-offer-name"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-offer-description">Description</Label>
                                  <Input
                                    id="edit-offer-description"
                                    value={offerDescription}
                                    onChange={(e) => setOfferDescription(e.target.value)}
                                    data-testid="input-edit-offer-description"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  onClick={handleEditOffer}
                                  disabled={updateOfferMutation.isPending}
                                  data-testid="button-update-offer"
                                >
                                  {updateOfferMutation.isPending ? "Mise à jour..." : "Mettre à jour"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteOfferMutation.mutate(offer.id)}
                            disabled={deleteOfferMutation.isPending}
                            data-testid={`button-delete-offer-${offer.id}`}
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {offers?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8" data-testid="text-no-offers">
                        Aucune offre configurée. Créez-en une pour commencer.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <h2 className="text-2xl font-bold text-foreground mb-4">Configurations de prix</h2>
          <Card className="rounded-2xl shadow-lg border border-border">
            <CardContent className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead data-testid="header-offer">Offre</TableHead>
                    <TableHead data-testid="header-machine">Machine</TableHead>
                    <TableHead data-testid="header-price">Prix</TableHead>
                    <TableHead className="text-right" data-testid="header-actions">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceConfigs?.map((config) => (
                    <TableRow key={config.id} data-testid={`row-config-${config.id}`}>
                      <TableCell data-testid={`cell-offer-${config.id}`}>
                        <Badge variant="outline">{getOfferName(config.offerId)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground" data-testid={`cell-machine-${config.id}`}>
                        {getMachineName(config.machineId)}
                      </TableCell>
                      <TableCell className="font-semibold" data-testid={`cell-price-${config.id}`}>
                        {(config.amountCents / 100).toFixed(2)} €
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Dialog open={editingConfig?.id === config.id} onOpenChange={(open) => !open && setEditingConfig(null)}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(config)}
                                data-testid={`button-edit-${config.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent data-testid="dialog-edit-price">
                              <DialogHeader>
                                <DialogTitle>Modifier le prix</DialogTitle>
                                <DialogDescription>
                                  {getOfferName(config.offerId)} - {getMachineName(config.machineId)}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="edit-amount">Prix (€)</Label>
                                  <Input
                                    id="edit-amount"
                                    type="number"
                                    step="0.01"
                                    value={amountEuros}
                                    onChange={(e) => setAmountEuros(e.target.value)}
                                    data-testid="input-edit-amount"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button 
                                  onClick={handleUpdate} 
                                  disabled={updatePriceMutation.isPending}
                                  data-testid="button-confirm-update"
                                >
                                  {updatePriceMutation.isPending ? "Mise à jour..." : "Mettre à jour"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deletePriceMutation.mutate(config.id)}
                            disabled={deletePriceMutation.isPending}
                            data-testid={`button-delete-${config.id}`}
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {priceConfigs?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8" data-testid="text-no-configs">
                        Aucune configuration de prix. Créez-en une pour commencer.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
