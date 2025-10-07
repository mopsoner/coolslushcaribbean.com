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
import { Settings, Edit, Trash, Plus, Snowflake } from "lucide-react";
import type { Machine } from "@shared/schema";
import { useState } from "react";

const statusOptions = [
  { value: "AVAILABLE", label: "Disponible", variant: "default" as const },
  { value: "UNAVAILABLE", label: "Indisponible", variant: "secondary" as const },
  { value: "MAINTENANCE", label: "Maintenance", variant: "destructive" as const },
];

export default function AdminMachines() {
  const { toast } = useToast();
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [machineName, setMachineName] = useState<string>("");
  const [machineStatus, setMachineStatus] = useState<string>("AVAILABLE");

  const { data: machines, isLoading } = useQuery<Machine[]>({
    queryKey: ['/api/machines'],
  });

  const createMachineMutation = useMutation({
    mutationFn: async (data: { name: string; status: string }) => {
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
    mutationFn: async (data: { id: string; name?: string; status?: string }) => {
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

  const resetForm = () => {
    setMachineName("");
    setMachineStatus("AVAILABLE");
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
    });
  };

  const handleEdit = () => {
    if (!editingMachine) return;

    const updates: any = {};
    if (machineName) updates.name = machineName;
    if (machineStatus) updates.status = machineStatus;

    updateMachineMutation.mutate({
      id: editingMachine.id,
      ...updates,
    });
  };

  const openEditDialog = (machine: Machine) => {
    setEditingMachine(machine);
    setMachineName(machine.name);
    setMachineStatus(machine.status);
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
                      Créez une nouvelle machine avec son nom et son statut
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="machine-name">Nom de la machine</Label>
                      <Input
                        id="machine-name"
                        placeholder="Ex: EZBASICS Slushy Machine"
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
                                    Modifiez le nom ou le statut de la machine
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
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
                <Settings className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Aucune machine configurée</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter la première machine
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
