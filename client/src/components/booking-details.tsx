import { useQuery } from "@tanstack/react-query";
import type { Booking, Syrup, Offer } from "@shared/schema";
import { formatEuro } from "@shared/utils";

interface BookingDetailsProps {
  booking: Booking;
  showTotal?: boolean;
  className?: string;
}

export default function BookingDetails({ booking, showTotal = true, className = "" }: BookingDetailsProps) {
  const { data: syrups, isLoading: syrupsLoading, error: syrupsError } = useQuery<Syrup[]>({
    queryKey: ['/api/syrups'],
  });

  const { data: offers } = useQuery<Offer[]>({
    queryKey: ['/api/offers'],
  });

  const startDate = new Date(booking.startDate);
  const endDate = new Date(booking.endDate);
  const isMultipleDays = startDate.toDateString() !== endDate.toDateString();
  const dateDisplay = isMultipleDays 
    ? `${startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : startDate.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const selectedSyrups = (booking.selectedSyrups as Array<{ syrupId: string; quantity: number }>) || [];
  
  // Map selected syrups to their details
  const selectedSyrupsDetails = selectedSyrups
    .map(selection => {
      const syrup = syrups?.find(s => s.id === selection.syrupId);
      return syrup ? { ...syrup, quantity: selection.quantity } : null;
    })
    .filter((item): item is (Syrup & { quantity: number }) => item !== null);

  const cupSizeLabel = {
    petit: "Petit (200ml)",
    moyen: "Moyen (300ml)",
    grand: "Grand (500ml)"
  }[booking.cupSize || "moyen"];

  // Find the offer to get its price
  const currentOffer = offers?.find(o => o.name === booking.offer);
  
  // Calculate rental days
  const rentalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  return (
    <div className={`bg-white dark:bg-muted/30 rounded-xl border border-border overflow-hidden ${className}`}>
      {/* Header with offer name */}
      <div className="bg-primary/10 dark:bg-primary/20 px-6 py-4 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground" data-testid="booking-detail-offer">
          {booking.offer}
        </h3>
      </div>

      <div className="p-6 space-y-4">
        {/* Date & Time Section */}
        <div className="space-y-2">
          <div className="flex justify-between items-center" data-testid="booking-detail-date">
            <span className="text-sm text-muted-foreground">{isMultipleDays ? 'Période' : 'Date'}</span>
            <span className="font-semibold text-foreground">{dateDisplay}</span>
          </div>
          <div className="flex justify-between items-center" data-testid="booking-detail-time">
            <span className="text-sm text-muted-foreground">Horaires</span>
            <span className="font-semibold text-foreground">
              {booking.startHour.toString().padStart(2, '0')}:00 - {booking.endHour.toString().padStart(2, '0')}:00
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border"></div>

        {/* Machines Section */}
        <div data-testid="booking-detail-machines">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-foreground">Machines réservées</span>
            <span className="text-sm px-2.5 py-0.5 bg-primary/20 text-primary rounded-full font-medium">
              {booking.machines} machine{booking.machines > 1 ? 's' : ''}
            </span>
          </div>
          {booking.bookedMachines && (booking.bookedMachines as Array<{ machineId: string; machineName: string; quantity: number }>).length > 0 ? (
            <div className="space-y-2 bg-muted/50 dark:bg-muted/20 rounded-lg p-3">
              {(booking.bookedMachines as Array<{ machineId: string; machineName: string; quantity: number }>).map((machine, index) => (
                <div key={machine.machineId || index} className="flex justify-between items-center" data-testid={`machine-${machine.machineId}`}>
                  <span className="text-sm text-foreground font-medium">• {machine.machineName}</span>
                  <span className="text-sm text-muted-foreground font-semibold">× {machine.quantity}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-muted/50 dark:bg-muted/20 rounded-lg p-3 text-sm text-muted-foreground">
              {booking.machines} machine{booking.machines > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Price breakdown */}
        {currentOffer && (
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800" data-testid="booking-detail-price-breakdown">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Prix par machine/jour</span>
                <span className="font-medium">{formatEuro(currentOffer.basePriceCents)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-foreground">
                  {booking.machines} × {rentalDays} jour{rentalDays > 1 ? 's' : ''}
                </span>
                <span className="font-semibold text-foreground">
                  {formatEuro(currentOffer.basePriceCents * booking.machines * rentalDays)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Sirops Section */}
        {selectedSyrups.length > 0 && (
          <>
            <div className="border-t border-border"></div>
            <div data-testid="booking-detail-syrups">
              <div className="mb-3">
                <span className="text-sm font-semibold text-foreground">Sirops choisis</span>
              </div>
              {syrupsLoading ? (
                <div className="bg-muted/50 dark:bg-muted/20 rounded-lg p-3 text-sm text-muted-foreground">
                  Chargement...
                </div>
              ) : syrupsError ? (
                <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                  Erreur lors du chargement des sirops
                </div>
              ) : selectedSyrupsDetails.length > 0 ? (
                <div className="space-y-2 bg-muted/50 dark:bg-muted/20 rounded-lg p-3">
                  {selectedSyrupsDetails.map((syrup) => (
                    <div key={syrup.id} className="flex justify-between items-center" data-testid={`syrup-${syrup.id}`}>
                      <span className="text-sm text-foreground">
                        • {syrup.name} × {syrup.quantity}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {formatEuro(syrup.amountCents * syrup.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-muted/50 dark:bg-muted/20 rounded-lg p-3 text-sm text-muted-foreground">
                  {selectedSyrups.length} sirop{selectedSyrups.length > 1 ? 's' : ''} sélectionné{selectedSyrups.length > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </>
        )}

        {/* Cup Size Section */}
        <div className="flex justify-between items-center" data-testid="booking-detail-cupsize">
          <span className="text-sm text-muted-foreground">Taille de gobelets</span>
          <span className="font-semibold text-foreground">{cupSizeLabel}</span>
        </div>
      </div>

      {/* Total Section - Highlighted */}
      {showTotal && (
        <div className="bg-gradient-to-r from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 px-6 py-5 border-t-2 border-primary">
          <div className="flex justify-between items-center">
            <span className="text-base font-semibold text-foreground">Montant total à payer</span>
            <span className="text-3xl font-bold text-primary" data-testid="booking-detail-total">
              {formatEuro(booking.totalCents)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
