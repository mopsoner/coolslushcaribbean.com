/**
 * Calculate the number of rental days between two dates (inclusive)
 * 
 * Examples:
 * - Same day (Jan 1 to Jan 1) = 1 day
 * - Next day (Jan 1 to Jan 2) = 2 days
 * - Weekend (Jan 1 to Jan 3) = 3 days
 * 
 * @param startDate - The start date of the rental
 * @param endDate - The end date of the rental
 * @returns The number of rental days (minimum 1)
 */
export function calculateRentalDays(startDate: Date, endDate: Date): number {
  // Normalize dates to midnight local time to avoid timezone issues
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  // Calculate difference in milliseconds
  const diffMs = end.getTime() - start.getTime();
  
  // Convert to days and add 1 to make it inclusive (both start and end dates count)
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
  
  // Ensure at least 1 day
  return Math.max(1, diffDays);
}

/**
 * Calculate the total price for a booking
 * 
 * Formula: (daily price × machines × rental days) + (syrup price × quantity)
 * 
 * @param dailyPriceCents - Price per machine per day in cents
 * @param machineCount - Number of machines
 * @param rentalDays - Number of rental days
 * @param syrupTotalCents - Total price of syrups in cents
 * @returns Total price in cents
 */
export function calculateBookingTotal(
  dailyPriceCents: number,
  machineCount: number,
  rentalDays: number,
  syrupTotalCents: number = 0
): number {
  const machinesCost = dailyPriceCents * machineCount * rentalDays;
  return machinesCost + syrupTotalCents;
}
