import { useQuery, useMutation } from "@tanstack/react-query";
import AdminNav from "@/components/admin-nav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Droplet, Edit, Trash, Plus } from "lucide-react";
import type { Syrup } from "@shared/schema";
import { useState } from "react";

export default function AdminSyrups() {
  const { toast } = useToast();
  const [editingSyrup, setEditingSyrup] = useState<Syrup | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [syrupName, setSyrupName] = useState<string>("");
  const [amountEuros, setAmountEuros] = useState<string>("");

  const { data: syrups, isLoading } = useQuery<Syrup[]>({
    queryKey: ['/api/admin/syrups'],
  });

  const createSyrupMutation = useMutation({
    mutationFn: async (data: { name: string; amountCents: number }) => {
      const response = await apiRequest('POST', '/api/admin/syrups', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/syrups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/syrups'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Sirop créé",
        description: "Le sirop a été créé avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de créer le sirop",
        variant: "destructive",
      });
    },
  });

  const updateSyrupMutation = useMutation({
    mutationFn: async (data: { id: string; name?: string; amountCents?: number; active?: boolean }) => {
      const response = await apiRequest('PATCH', `/api/admin/syrups/${data.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/syrups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/syrups'] });
      setEditingSyrup(null);
      resetForm();
      toast({
        title: "Sirop mis à jour",
        description: "Le sirop a été mis à jour avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le sirop",
        variant: "destructive",
      });
    },
  });

  const deleteSyrupMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/admin/syrups/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/syrups'] });
      queryClient.invalidateQueries({ queryKey: ['/api/syrups'] });
      toast({
        title: "Sirop supprimé",
        description: "Le sirop a été supprimé avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de supprimer le sirop",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSyrupName("");
    setAmountEuros("");
  };

  const handleCreate = () => {
    if (!syrupName) {
      toast({
        title: "Erreur de validation",
        description: "Veuillez entrer un nom de sirop",
        variant: "destructive",
      });
      return;
    }

    const amountCents = amountEuros ? Math.round(parseFloat(amountEuros) * 100) : 0;
    createSyrupMutation.mutate({
      name: syrupName,
      amountCents,
    });
  };

  const handleEdit = () => {
    if (!editingSyrup) return;

    const updates: any = {};
    if (syrupName) updates.name = syrupName;
    if (amountEuros) updates.amountCents = Math.round(parseFloat(amountEuros) * 100);

    updateSyrupMutation.mutate({
      id: editingSyrup.id,
      ...updates,
    });
  };

  const toggleActive = (syrup: Syrup) => {
    updateSyrupMutation.mutate({
      id: syrup.id,
      active: !syrup.active,
    });
  };

  const openEditDialog = (syrup: Syrup) => {
    setEditingSyrup(syrup);
    setSyrupName(syrup.name);
    setAmountEuros((syrup.amountCents / 100).toFixed(2));
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Gestion des Sirops</h1>
          <p className="text-muted-foreground">Gérez les sirops disponibles pour les réservations</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <Droplet className="w-6 h-6 text-primary mr-2" />
                <h2 className="text-2xl font-bold">Sirops disponibles</h2>
              </div>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-tropical" data-testid="button-add-syrup">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un sirop
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="dialog-add-syrup">
                  <DialogHeader>
                    <DialogTitle>Ajouter un sirop</DialogTitle>
                    <DialogDescription>
                      Créez un nouveau sirop avec son nom et son prix optionnel
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="syrup-name">Nom du sirop</Label>
                      <Input
                        id="syrup-name"
                        placeholder="Ex: Menthe, Fraise, Citron..."
                        value={syrupName}
                        onChange={(e) => setSyrupName(e.target.value)}
                        data-testid="input-syrup-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="syrup-price">Prix (€) - optionnel</Label>
                      <Input
                        id="syrup-price"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={amountEuros}
                        onChange={(e) => setAmountEuros(e.target.value)}
                        data-testid="input-syrup-price"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Laissez vide pour un sirop gratuit
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={handleCreate}
                      disabled={createSyrupMutation.isPending}
                      data-testid="button-save-syrup"
                    >
                      {createSyrupMutation.isPending ? "Création..." : "Créer"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <div className="text-center py-8">Chargement...</div>
            ) : syrups && syrups.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {syrups.map((syrup) => (
                    <TableRow key={syrup.id} data-testid={`row-syrup-${syrup.id}`}>
                      <TableCell className="font-medium">{syrup.name}</TableCell>
                      <TableCell>
                        {syrup.amountCents > 0 ? `${(syrup.amountCents / 100).toFixed(2)} €` : 'Gratuit'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={syrup.active ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => toggleActive(syrup)}
                          data-testid={`badge-syrup-status-${syrup.id}`}
                        >
                          {syrup.active ? "Actif" : "Inactif"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Dialog open={editingSyrup?.id === syrup.id} onOpenChange={(open) => !open && setEditingSyrup(null)}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditDialog(syrup)}
                                data-testid={`button-edit-syrup-${syrup.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Modifier le sirop</DialogTitle>
                                <DialogDescription>
                                  Modifiez le nom ou le prix du sirop
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div>
                                  <Label htmlFor="edit-syrup-name">Nom du sirop</Label>
                                  <Input
                                    id="edit-syrup-name"
                                    value={syrupName}
                                    onChange={(e) => setSyrupName(e.target.value)}
                                    data-testid="input-edit-syrup-name"
                                  />
                                </div>
                                <div>
                                  <Label htmlFor="edit-syrup-price">Prix (€)</Label>
                                  <Input
                                    id="edit-syrup-price"
                                    type="number"
                                    step="0.01"
                                    value={amountEuros}
                                    onChange={(e) => setAmountEuros(e.target.value)}
                                    data-testid="input-edit-syrup-price"
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  onClick={handleEdit}
                                  disabled={updateSyrupMutation.isPending}
                                  data-testid="button-update-syrup"
                                >
                                  {updateSyrupMutation.isPending ? "Mise à jour..." : "Mettre à jour"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteSyrupMutation.mutate(syrup.id)}
                            disabled={deleteSyrupMutation.isPending}
                            data-testid={`button-delete-syrup-${syrup.id}`}
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Droplet className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">Aucun sirop configuré</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter le premier sirop
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
