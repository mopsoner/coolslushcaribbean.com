import { useQuery, useMutation } from "@tanstack/react-query";
import AdminNav from "@/components/admin-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Settings, Edit, Trash, Plus, Snowflake, Upload, X, Image as ImageIcon } from "lucide-react";
import type { Machine } from "@shared/schema";
import { useState, useRef } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";

const statusOptions = [
  { value: "AVAILABLE", label: "Disponible", variant: "default" as const },
  { value: "UNAVAILABLE", label: "Indisponible", variant: "secondary" as const },
  { value: "MAINTENANCE", label: "Maintenance", variant: "destructive" as const },
];

function getMachineImageUrl(machine: Machine): string {
  if (!machine.imageUrl) return '';
  const timestamp = new Date(machine.updatedAt || Date.now()).getTime();
  if (machine.imageUrl.startsWith('/replit-objstore-')) {
    const pathWithoutBucket = machine.imageUrl.split('/').slice(2).join('/');
    return `/public-objects/${pathWithoutBucket}?t=${timestamp}`;
  }
  return `${machine.imageUrl}?t=${timestamp}`;
}

export default function AdminMachines() {
  useAdminAuth();

  const { toast } = useToast();
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [machineName, setMachineName] = useState<string>("");
  const [machineStatus, setMachineStatus] = useState<string>("AVAILABLE");
  const [machineQuantity, setMachineQuantity] = useState<number>(1);
  const [machineModel, setMachineModel] = useState<string>("Ninja Slushi 2,5L - 5 programmes");
  const [machineCapacity, setMachineCapacity] = useState<string>("2,5 litres");
  const [machinePrograms, setMachinePrograms] = useState<string>("Slushi, Milkshake, Frozen Drink, Smoothie, Glace italienne");
  const [machineFeatures, setMachineFeatures] = useState<string>("Refroidissement rapide et efficace, Facile à nettoyer");
  const [machineServices, setMachineServices] = useState<string>("✅ Livraison et installation incluses, 📖 Manuel d'utilisation fourni, 🎯 Support technique 7j/7");
  const [uploadingImageFor, setUploadingImageFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: machines, isLoading } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const createMachineMutation = useMutation({
    mutationFn: async (data: { name: string; status: string; quantity?: number; model?: string; capacity?: string; programs?: string[]; features?: string[]; includedServices?: string[] }) => {
      const response = await apiRequest('POST', '/api/admin/machines', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/machines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/machines/available'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Machine créée",
        description: "La machine a été créée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer la machine",
        variant: "destructive",
      });
    },
  });

  const updateMachineMutation = useMutation({
    mutationFn: async (data: { id: string; name?: string; status?: string; quantity?: number; model?: string; capacity?: string; programs?: string[]; features?: string[]; includedServices?: string[] }) => {
      const response = await apiRequest('PATCH', `/api/admin/machines/${data.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/machines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/machines/available'] });
      setEditingMachine(null);
      resetForm();
      toast({
        title: "Machine mise à jour",
        description: "La machine a été mise à jour avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour la machine",
        variant: "destructive",
      });
    },
  });

  const deleteMachineMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/machines/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/machines'] });
      queryClient.invalidateQueries({ queryKey: ['/api/machines/available'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/price-configs'] });
      toast({
        title: "Machine supprimée",
        description: "La machine a été supprimée avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer la machine",
        variant: "destructive",
      });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async ({ machineId, file }: { machineId: string; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`/api/admin/machines/${machineId}/image`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de l'upload");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/machines'] });
      setUploadingImageFor(null);
      toast({
        title: "Image uploadée",
        description: "L'image de la machine a été mise à jour.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'uploader l'image",
        variant: "destructive",
      });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (machineId: string) => {
      const response = await apiRequest('DELETE', `/api/admin/machines/${machineId}/image`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/machines'] });
      toast({
        title: "Image supprimée",
        description: "L'image de la machine a été supprimée.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer l'image",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setMachineName("");
    setMachineStatus("AVAILABLE");
    setMachineQuantity(1);
    setMachineModel("Ninja Slushi 2,5L - 5 programmes");
    setMachineCapacity("2,5 litres");
    setMachinePrograms("Slushi, Milkshake, Frozen Drink, Smoothie, Glace italienne");
    setMachineFeatures("Refroidissement rapide et efficace, Facile à nettoyer");
    setMachineServices("✅ Livraison et installation incluses, 📖 Manuel d'utilisation fourni, 🎯 Support technique 7j/7");
  };

  const handleCreate = () => {
    if (!machineName) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez entrer un nom de machine",
        variant: "destructive",
      });
      return;
    }

    createMachineMutation.mutate({
      name: machineName,
      status: machineStatus,
      quantity: machineQuantity,
      model: machineModel,
      capacity: machineCapacity,
      programs: machinePrograms.split(',').map(p => p.trim()).filter(Boolean),
      features: machineFeatures.split(',').map(f => f.trim()).filter(Boolean),
      includedServices: machineServices.split(',').map(s => s.trim()).filter(Boolean),
    });
  };

  const handleEdit = () => {
    if (!editingMachine) return;

    const updates: any = {};
    if (machineName) updates.name = machineName;
    if (machineStatus) updates.status = machineStatus;
    if (machineQuantity !== undefined) updates.quantity = machineQuantity;
    if (machineModel) updates.model = machineModel;
    if (machineCapacity) updates.capacity = machineCapacity;
    if (machinePrograms) updates.programs = machinePrograms.split(',').map(p => p.trim()).filter(Boolean);
    if (machineFeatures) updates.features = machineFeatures.split(',').map(f => f.trim()).filter(Boolean);
    if (machineServices) updates.includedServices = machineServices.split(',').map(s => s.trim()).filter(Boolean);

    updateMachineMutation.mutate({
      id: editingMachine.id,
      ...updates,
    });
  };

  const openEditDialog = (machine: Machine) => {
    setEditingMachine(machine);
    setMachineName(machine.name);
    setMachineStatus(machine.status);
    setMachineQuantity(machine.quantity || 1);
    setMachineModel(machine.model || "Ninja Slushi 2,5L - 5 programmes");
    setMachineCapacity(machine.capacity || "2,5 litres");
    setMachinePrograms((machine.programs as string[] || []).join(', '));
    setMachineFeatures((machine.features as string[] || []).join(', '));
    setMachineServices((machine.includedServices as string[] || []).join(', '));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, machineId: string) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImageMutation.mutate({ machineId, file });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = (machineId: string) => {
    setUploadingImageFor(machineId);
    fileInputRef.current?.click();
  };

  const getStatusBadge = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option || statusOptions[0];
  };

  const totalMachines = machines?.length || 0;
  const availableMachines = machines?.filter(m => m.status === "AVAILABLE").length || 0;

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2" data-testid="text-admin-machines-title">
            Gestion des Machines
          </h1>
          <p className="text-muted-foreground">Gérez les machines disponibles pour les réservations</p>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={(e) => uploadingImageFor && handleFileChange(e, uploadingImageFor)}
          data-testid="input-machine-image-file"
        />

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="rounded-2xl shadow-lg border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium" data-testid="stat-total-machines-label">
                    Machines totales
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-1" data-testid="stat-total-machines-value">
                    {totalMachines}
                  </p>
                </div>
                <Settings className="w-10 h-10 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-lg border border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm font-medium" data-testid="stat-available-machines-label">
                    Machines disponibles
                  </p>
                  <p className="text-3xl font-bold text-foreground mt-1" data-testid="stat-available-machines-value">
                    {availableMachines}
                  </p>
                </div>
                <Snowflake className="w-10 h-10 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <Settings className="w-6 h-6 text-primary mr-2" />
                <h2 className="text-2xl font-bold">Machines configurées</h2>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-tropical" data-testid="button-add-machine">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter une machine
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-add-machine">
                  <DialogHeader>
                    <DialogTitle>Ajouter une machine</DialogTitle>
                    <DialogDescription>
                      Créez une nouvelle machine avec ses caractéristiques techniques
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div>
                      <Label htmlFor="machine-name">Nom de la machine</Label>
                      <Input
                        id="machine-name"
                        placeholder="Ex: Ninja Slushi #1"
                        value={machineName}
                        onChange={(e) => setMachineName(e.target.value)}
                        data-testid="input-machine-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="machine-status">Statut</Label>
                      <Select value={machineStatus} onValueChange={setMachineStatus}>
                        <SelectTrigger id="machine-status" data-testid="select-machine-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map(option => (
                            <SelectItem key={option.value} value={option.value} data-testid={`option-status-${option.value}`}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="machine-quantity">Quantité disponible</Label>
                      <Input
                        id="machine-quantity"
                        type="number"
                        min="1"
                        placeholder="Ex: 1"
                        value={machineQuantity}
                        onChange={(e) => setMachineQuantity(parseInt(e.target.value) || 1)}
                        data-testid="input-machine-quantity"
                      />
                    </div>
                    <div>
                      <Label htmlFor="machine-model">Modèle</Label>
                      <Input
                        id="machine-model"
                        placeholder="Ex: Ninja Slushi 2,5L - 5 programmes"
                        value={machineModel}
                        onChange={(e) => setMachineModel(e.target.value)}
                        data-testid="input-machine-model"
                      />
                    </div>
                    <div>
                      <Label htmlFor="machine-capacity">Capacité</Label>
                      <Input
                        id="machine-capacity"
                        placeholder="Ex: 2,5 litres"
                        value={machineCapacity}
                        onChange={(e) => setMachineCapacity(e.target.value)}
                        data-testid="input-machine-capacity"
                      />
                    </div>
                    <div>
                      <Label htmlFor="machine-programs">Programmes (séparés par des virgules)</Label>
                      <Input
                        id="machine-programs"
                        placeholder="Ex: Slushi, Milkshake, Frozen Drink"
                        value={machinePrograms}
                        onChange={(e) => setMachinePrograms(e.target.value)}
                        data-testid="input-machine-programs"
                      />
                    </div>
                    <div>
                      <Label htmlFor="machine-features">Fonctionnalités (séparées par des virgules)</Label>
                      <Input
                        id="machine-features"
                        placeholder="Ex: Refroidissement rapide, Facile à nettoyer"
                        value={machineFeatures}
                        onChange={(e) => setMachineFeatures(e.target.value)}
                        data-testid="input-machine-features"
                      />
                    </div>
                    <div>
                      <Label htmlFor="machine-services">Services inclus (séparés par des virgules)</Label>
                      <Input
                        id="machine-services"
                        placeholder="Ex: ✅ Livraison incluse, 📖 Manuel fourni"
                        value={machineServices}
                        onChange={(e) => setMachineServices(e.target.value)}
                        data-testid="input-machine-services"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleCreate}
                      disabled={createMachineMutation.isPending}
                      data-testid="button-save-machine"
                    >
                      {createMachineMutation.isPending ? "Création..." : "Créer"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="text-center py-8">Chargement...</div>
            ) : machines && machines.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Image</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {machines.map((machine) => {
                    const statusBadge = getStatusBadge(machine.status);
                    return (
                      <TableRow key={machine.id} data-testid={`row-machine-${machine.id}`}>
                        <TableCell>
                          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                            {machine.imageUrl ? (
                              <>
                                <img
                                  src={getMachineImageUrl(machine)}
                                  alt={machine.name}
                                  className="w-full h-full object-cover"
                                  data-testid={`img-machine-${machine.id}`}
                                />
                                <button
                                  onClick={() => deleteImageMutation.mutate(machine.id)}
                                  className="absolute top-0 right-0 bg-destructive text-destructive-foreground rounded-bl p-1 hover:bg-destructive/90"
                                  data-testid={`button-delete-image-${machine.id}`}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => triggerFileInput(machine.id)}
                                className="w-full h-full flex flex-col items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                                data-testid={`button-upload-image-${machine.id}`}
                              >
                                <ImageIcon className="w-6 h-6" />
                                <span className="text-xs mt-1">Ajouter</span>
                              </button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{machine.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant={statusBadge.variant}
                            data-testid={`badge-machine-status-${machine.id}`}
                          >
                            {statusBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => triggerFileInput(machine.id)}
                              disabled={uploadImageMutation.isPending}
                              data-testid={`button-change-image-${machine.id}`}
                            >
                              <Upload className="w-4 h-4" />
                            </Button>
                            <Dialog open={editingMachine?.id === machine.id} onOpenChange={(open) => !open && setEditingMachine(null)}>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditDialog(machine)}
                                  data-testid={`button-edit-machine-${machine.id}`}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Modifier la machine</DialogTitle>
                                  <DialogDescription>
                                    Modifiez les caractéristiques techniques de la machine
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                                  <div>
                                    <Label htmlFor="edit-machine-name">Nom de la machine</Label>
                                    <Input
                                      id="edit-machine-name"
                                      value={machineName}
                                      onChange={(e) => setMachineName(e.target.value)}
                                      data-testid="input-edit-machine-name"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-machine-status">Statut</Label>
                                    <Select value={machineStatus} onValueChange={setMachineStatus}>
                                      <SelectTrigger id="edit-machine-status" data-testid="select-edit-machine-status">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {statusOptions.map(option => (
                                          <SelectItem key={option.value} value={option.value} data-testid={`option-edit-status-${option.value}`}>
                                            {option.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-machine-quantity">Quantité disponible</Label>
                                    <Input
                                      id="edit-machine-quantity"
                                      type="number"
                                      min="1"
                                      value={machineQuantity}
                                      onChange={(e) => setMachineQuantity(parseInt(e.target.value) || 1)}
                                      data-testid="input-edit-machine-quantity"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-machine-model">Modèle</Label>
                                    <Input
                                      id="edit-machine-model"
                                      value={machineModel}
                                      onChange={(e) => setMachineModel(e.target.value)}
                                      data-testid="input-edit-machine-model"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-machine-capacity">Capacité</Label>
                                    <Input
                                      id="edit-machine-capacity"
                                      value={machineCapacity}
                                      onChange={(e) => setMachineCapacity(e.target.value)}
                                      data-testid="input-edit-machine-capacity"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-machine-programs">Programmes (séparés par des virgules)</Label>
                                    <Input
                                      id="edit-machine-programs"
                                      value={machinePrograms}
                                      onChange={(e) => setMachinePrograms(e.target.value)}
                                      data-testid="input-edit-machine-programs"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-machine-features">Fonctionnalités (séparées par des virgules)</Label>
                                    <Input
                                      id="edit-machine-features"
                                      value={machineFeatures}
                                      onChange={(e) => setMachineFeatures(e.target.value)}
                                      data-testid="input-edit-machine-features"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="edit-machine-services">Services inclus (séparés par des virgules)</Label>
                                    <Input
                                      id="edit-machine-services"
                                      value={machineServices}
                                      onChange={(e) => setMachineServices(e.target.value)}
                                      data-testid="input-edit-machine-services"
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    onClick={handleEdit}
                                    disabled={updateMachineMutation.isPending}
                                    data-testid="button-update-machine"
                                  >
                                    {updateMachineMutation.isPending ? "Mise à jour..." : "Mettre à jour"}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteMachineMutation.mutate(machine.id)}
                              disabled={deleteMachineMutation.isPending}
                              data-testid={`button-delete-machine-${machine.id}`}
                            >
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Snowflake className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Aucune machine configurée</p>
                <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-add-first-machine">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter votre première machine
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
