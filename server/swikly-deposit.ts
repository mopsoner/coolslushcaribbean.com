import type { Booking } from "@shared/schema";
import { getPublicAppOrigin } from "./config";
import type { getSwiklyClient } from "./swikly";

type SwiklyDepositClient = Pick<ReturnType<typeof getSwiklyClient>, "createDeposit">;

/** Provider seam used by production and by a controlled integration double. */
export function createSwiklyDeposit(
  client: SwiklyDepositClient,
  booking: Booking,
  returnToken: string,
) {
  return client.createDeposit(booking, getPublicAppOrigin(), returnToken);
}
