import { useQuery, useMutation } from "@tanstack/react-query";
import { Booking } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Edit, Calendar, Users, TrendingUp, MapPin, Coffee, Droplet, CreditCard, Shield, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import AdminNav from "@/components/admin-nav";
import { useState } from "react";
import { useAdminAuth } from "@/hooks/use-admin-auth";

const statusMap = {
  PENDING: { 
    label: "En attente", 
    className: "bg-yellow-100 text-yellow-800"
  },
  CONFIRMED: { 
    label: "Confirmée", 
    className: "bg-success/10 text-success"
  },
  CANCELLED: { 
    label: "Annulée", 
    className: "bg-destructive/10 text-destructive"
  }
};

export default function AdminBookings() {
  useAdminAuth();

  const { toast } = useToast();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [editingStatusBooking, setEditingStatusBooking] = useState<Booking | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");

  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ['/api/bookings'],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (data: { id: string; status: string }) => {
      const response = await apiRequest('PATCH', `/api/bookings/${data.id}/status`, { status: data.status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      setEditingStatusBooking(null);
      toast({
        title: "Statut mis à jour",
        description: "Le statut de la réservation a été mis à jour avec succès.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AdminNav />
        <div className="h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" aria-label="Loading" data-testid="loading-admin" />
        </div>
      </div>
    );
  }

  const totalBookings = bookings?.length || 0;
  const confirmedBookings = bookings?.filter(b => b.status === 'CONFIRMED').length || 0;
  const totalRevenue = bookings?.filter(b => b.status === 'CONFIRMED').reduce((sum, b) => sum + b.totalCents, 0) || 0;

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2" data-testid="text-admin-title">
              Gestion des réservations
            </h1>
            <p className="text-muted-foreground" data-testid="text-admin-subtitle">
              Vue d'ensemble des réservations et statuts des machines
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card className="rounded-2xl shadow-lg border border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium" data-testid="stat-total-bookings-label">
                      Total réservations
                    </p>
                    <p className="text-3xl font-bold text-foreground" data-testid="stat-total-bookings-value">
                      {totalBookings}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-lg border border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium" data-testid="stat-confirmed-bookings-label">
                      Confirmées
                    </p>
                    <p className="text-3xl font-bold text-foreground" data-testid="stat-confirmed-bookings-value">
                      {confirmedBookings}
                    </p>
                  </div>
                  <Users className="w-8 h-8 text-success" />
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl shadow-lg border border-border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm font-medium" data-testid="stat-revenue-label">
                      Chiffre d'affaires
                    </p>
                    <p className="text-3xl font-bold text-foreground" data-testid="stat-revenue-value">
                      {(totalRevenue / 100).toFixed(0)}€
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-accent" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bookings Table */}
          <Card className="rounded-3xl shadow-lg border border-border overflow-hidden">
            <CardHeader className="bg-muted/50">
              <CardTitle className="text-xl font-bold text-foreground" data-testid="text-bookings-table-title">
                Liste des réservations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-border">
                      <TableHead className="px-6 py-4 text-left text-sm font-semibold text-foreground">Réservation</TableHead>
                      <TableHead className="px-6 py-4 text-left text-sm font-semibold text-foreground">Client</TableHead>
                      <TableHead className="px-6 py-4 text-left text-sm font-semibold text-foreground">Date & Heure</TableHead>
                      <TableHead className="px-6 py-4 text-left text-sm font-semibold text-foreground">Machines</TableHead>
                      <TableHead className="px-6 py-4 text-left text-sm font-semibold text-foreground">Statut</TableHead>
                      <TableHead className="px-6 py-4 text-left text-sm font-semibold text-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings?.map((booking) => {
                      const status = statusMap[booking.status as keyof typeof statusMap];
                      return (
                        <TableRow key={booking.id} className="hover:bg-muted/50 transition-colors border-b border-border" data-testid={`row-booking-${booking.id}`}>
                          <TableCell className="px-6 py-4">
                            <div className="font-semibold text-foreground" data-testid={`text-booking-id-${booking.id}`}>
                              #{booking.id.slice(-8)}
                            </div>
                            <div className="text-sm text-muted-foreground" data-testid={`text-booking-created-${booking.id}`}>
                              {new Date(booking.createdAt).toLocaleDateString('fr-FR')}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="font-medium text-foreground" data-testid={`text-customer-name-${booking.id}`}>
                              {booking.customerName}
                            </div>
                            <div className="text-sm text-muted-foreground" data-testid={`text-customer-email-${booking.id}`}>
                              {booking.customerEmail}
                            </div>
                            <div className="text-sm text-muted-foreground" data-testid={`text-customer-phone-${booking.id}`}>
                              {booking.customerPhone}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="font-medium text-foreground" data-testid={`text-booking-offer-${booking.id}`}>
                              {booking.offer}
                            </div>
                            <div className="text-sm text-muted-foreground" data-testid={`text-booking-date-${booking.id}`}>
                              {new Date(booking.startDate).toDateString() !== new Date(booking.endDate).toDateString() 
                                ? `${new Date(booking.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${new Date(booking.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
                                : new Date(booking.startDate).toLocaleDateString('fr-FR')}
                            </div>
                            <div className="text-sm text-muted-foreground" data-testid={`text-booking-time-${booking.id}`}>
                              {booking.startHour.toString().padStart(2, '0')}:00 - {booking.endHour.toString().padStart(2, '0')}:00
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="font-medium text-foreground" data-testid={`text-booking-machines-${booking.id}`}>
                              {booking.machines} machine{booking.machines > 1 ? 's' : ''}
                            </div>
                            <div className="text-sm text-muted-foreground" data-testid={`text-booking-price-${booking.id}`}>
                              {booking.totalCents / 100}€
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <Badge className={status.className} data-testid={`badge-booking-status-${booking.id}`}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Dialog open={selectedBooking?.id === booking.id} onOpenChange={(open) => !open && setSelectedBooking(null)}>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="p-2 hover:bg-muted rounded-lg"
                                    onClick={() => setSelectedBooking(booking)}
                                    data-testid={`button-view-${booking.id}`}
                                  >
                                    <Eye className="w-4 h-4 text-foreground" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>Détails de la réservation #{booking.id.slice(-8)}</DialogTitle>
                                    <DialogDescription>
                                      Informations complètes de la réservation
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <h3 className="font-semibold text-sm text-muted-foreground mb-1">Client</h3>
                                        <p className="font-medium">{booking.customerName}</p>
                                        <p className="text-sm text-muted-foreground">{booking.customerEmail}</p>
                                        <p className="text-sm text-muted-foreground">{booking.customerPhone}</p>
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-sm text-muted-foreground mb-1 flex items-center gap-1">
                                          <MapPin className="w-4 h-4" /> Adresse de livraison
                                        </h3>
                                        <p className="text-sm">{booking.customerAddress || 'Non spécifiée'}</p>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <h3 className="font-semibold text-sm text-muted-foreground mb-1">Offre</h3>
                                        <p className="font-medium">{booking.offer}</p>
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-sm text-muted-foreground mb-1">Date(s)</h3>
                                        <p className="text-sm">
                                          {new Date(booking.startDate).toDateString() !== new Date(booking.endDate).toDateString() 
                                            ? `${new Date(booking.startDate).toLocaleDateString('fr-FR')} - ${new Date(booking.endDate).toLocaleDateString('fr-FR')}`
                                            : new Date(booking.startDate).toLocaleDateString('fr-FR')}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                          {booking.startHour.toString().padStart(2, '0')}:00 - {booking.endHour.toString().padStart(2, '0')}:00
                                        </p>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <h3 className="font-semibold text-sm text-muted-foreground mb-1">Machines</h3>
                                        <p className="font-medium">{booking.machines} machine{booking.machines > 1 ? 's' : ''}</p>
                                      </div>
                                      <div>
                                        <h3 className="font-semibold text-sm text-muted-foreground mb-1 flex items-center gap-1">
                                          <Coffee className="w-4 h-4" /> Taille gobelets
                                        </h3>
                                        <p className="capitalize">{booking.cupSize || 'moyen'}</p>
                                      </div>
                                    </div>

                                    {booking.selectedSyrups && Array.isArray(booking.selectedSyrups) && (booking.selectedSyrups as any[]).length > 0 ? (
                                      <div>
                                        <h3 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-1">
                                          <Droplet className="w-4 h-4" /> Sirops sélectionnés
                                        </h3>
                                        <div className="space-y-1">
                                          {(booking.selectedSyrups as any[]).map((syrup: any, idx: number) => (
                                            <p key={idx} className="text-sm">
                                              • Sirop {syrup.syrupId?.slice(-6)} - Quantité: {syrup.quantity}
                                            </p>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}

                                    <div>
                                      <h3 className="font-semibold text-sm text-muted-foreground mb-1">Prix total</h3>
                                      <p className="text-2xl font-bold text-primary">{(booking.totalCents / 100).toFixed(2)}€</p>
                                    </div>

                                    {booking.swiklyUrl && (
                                      <div>
                                        <h3 className="font-semibold text-sm text-muted-foreground mb-1 flex items-center gap-1">
                                          <Shield className="w-4 h-4" /> Lien Swikly
                                        </h3>
                                        <a 
                                          href={booking.swiklyUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-sm text-primary hover:underline flex items-center gap-1"
                                        >
                                          Ouvrir le lien Swikly <ExternalLink className="w-3 h-3" />
                                        </a>
                                      </div>
                                    )}

                                    {booking.stripePaymentId && (
                                      <div>
                                        <h3 className="font-semibold text-sm text-muted-foreground mb-1 flex items-center gap-1">
                                          <CreditCard className="w-4 h-4" /> ID Paiement Stripe
                                        </h3>
                                        <p className="text-sm font-mono">{booking.stripePaymentId}</p>
                                      </div>
                                    )}

                                    <div>
                                      <h3 className="font-semibold text-sm text-muted-foreground mb-1">Statut</h3>
                                      <Badge className={statusMap[booking.status as keyof typeof statusMap].className}>
                                        {statusMap[booking.status as keyof typeof statusMap].label}
                                      </Badge>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>

                              <Dialog open={editingStatusBooking?.id === booking.id} onOpenChange={(open) => !open && setEditingStatusBooking(null)}>
                                <DialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="p-2 hover:bg-muted rounded-lg"
                                    onClick={() => {
                                      setEditingStatusBooking(booking);
                                      setNewStatus(booking.status);
                                    }}
                                    data-testid={`button-edit-${booking.id}`}
                                  >
                                    <Edit className="w-4 h-4 text-foreground" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Modifier le statut</DialogTitle>
                                    <DialogDescription>
                                      Réservation #{booking.id.slice(-8)} - {booking.customerName}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div>
                                      <label className="text-sm font-medium">Statut</label>
                                      <Select value={newStatus} onValueChange={setNewStatus}>
                                        <SelectTrigger className="mt-2" data-testid="select-booking-status">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="PENDING">En attente</SelectItem>
                                          <SelectItem value="CONFIRMED">Confirmée</SelectItem>
                                          <SelectItem value="CANCELLED">Annulée</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      onClick={() => updateStatusMutation.mutate({ id: booking.id, status: newStatus })}
                                      disabled={updateStatusMutation.isPending || newStatus === booking.status}
                                      data-testid="button-save-status"
                                    >
                                      {updateStatusMutation.isPending ? "Mise à jour..." : "Mettre à jour"}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
