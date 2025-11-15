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
    queryKey: ['/api', 'syrups'],
  });

  const { data: offers } = useQuery<Offer[]>({
    queryKey: ['/api', 'offers'],
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
    <div className={`bg-white dark:bg-muted/30 rounded-xl p-6 space-y-3 border border-border ${className}`}>
      <div className="flex justify-between" data-testid="booking-detail-offer">
        <span className="text-muted-foreground">Offre</span>
        <span className="font-semibold text-foreground">{booking.offer}</span>
      </div>
      <div className="flex justify-between" data-testid="booking-detail-date">
        <span className="text-muted-foreground">{isMultipleDays ? 'Période' : 'Date'}</span>
        <span className="font-semibold text-foreground">{dateDisplay}</span>
      </div>
      <div className="flex justify-between" data-testid="booking-detail-time">
        <span className="text-muted-foreground">Horaires</span>
        <span className="font-semibold text-foreground">
          {booking.startHour.toString().padStart(2, '0')}:00 - {booking.endHour.toString().padStart(2, '0')}:00
        </span>
      </div>
      <div className="flex justify-between" data-testid="booking-detail-machines">
        <span className="text-muted-foreground">Machines</span>
        <span className="font-semibold text-foreground">
          {booking.machines} machine{booking.machines > 1 ? 's' : ''}
        </span>
      </div>
      
      {/* Price breakdown */}
      {currentOffer && (
        <div className="bg-primary/5 rounded-lg p-3 border border-primary/20" data-testid="booking-detail-price-breakdown">
          <div className="text-sm space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>Prix par machine/jour :</span>
              <span>{formatEuro(currentOffer.basePriceCents)}</span>
            </div>
            <div className="flex justify-between font-medium text-foreground">
              <span>{formatEuro(currentOffer.basePriceCents)} × {booking.machines} machine{booking.machines > 1 ? 's' : ''} × {rentalDays} jour{rentalDays > 1 ? 's' : ''}</span>
              <span>{formatEuro(currentOffer.basePriceCents * booking.machines * rentalDays)}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Sirops Section */}
      {selectedSyrups.length > 0 && (
        <div className="border-t border-border pt-3" data-testid="booking-detail-syrups">
          <div className="flex justify-between mb-2">
            <span className="text-muted-foreground font-medium">Sirops choisis</span>
          </div>
          {syrupsLoading ? (
            <div className="ml-4 text-sm text-muted-foreground">Chargement...</div>
          ) : syrupsError ? (
            <div className="ml-4 text-sm text-red-600 dark:text-red-400">
              Erreur lors du chargement des sirops
            </div>
          ) : selectedSyrupsDetails.length > 0 ? (
            <div className="space-y-1.5 ml-4">
              {selectedSyrupsDetails.map((syrup) => (
                <div key={syrup.id} className="flex justify-between text-sm" data-testid={`syrup-${syrup.id}`}>
                  <span className="text-muted-foreground">
                    {syrup.name} × {syrup.quantity}
                  </span>
                  <span className="text-foreground">
                    {formatEuro(syrup.amountCents * syrup.quantity)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="ml-4 text-sm text-muted-foreground">
              {selectedSyrups.length} sirop{selectedSyrups.length > 1 ? 's' : ''} sélectionné{selectedSyrups.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
      
      {/* Cup Size Section */}
      <div className="flex justify-between" data-testid="booking-detail-cupsize">
        <span className="text-muted-foreground">Taille de gobelets</span>
        <span className="font-semibold text-foreground">{cupSizeLabel}</span>
      </div>
      
      {showTotal && (
        <div className="flex justify-between border-t border-border pt-3">
          <span className="text-muted-foreground font-medium">Total</span>
          <span className="font-bold text-xl text-primary" data-testid="booking-detail-total">
            {formatEuro(booking.totalCents)}
          </span>
        </div>
      )}
    </div>
  );
}
