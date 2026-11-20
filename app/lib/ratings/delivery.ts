/** Order data needed to decide whether a whole order was delivered. */
export type DeliveryEvidence = {
  /** Customer Account API `Order.fulfillmentStatus`. */
  fulfillmentStatus?: string | null;
  lines: Array<{id: string; quantity: number}>;
  fulfillments: Array<{
    /** `Fulfillment.status`, e.g. SUCCESS, CANCELLED. */
    status?: string | null;
    /** `Fulfillment.latestShipmentStatus`, e.g. IN_TRANSIT, DELIVERED. */
    latestShipmentStatus?: string | null;
    items: Array<{lineItemId: string; quantity?: number | null}>;
  }>;
};

/**
 * Whether the whole order has been confirmed delivered (US-058 rule):
 *
 * - the order is FULFILLED (necessary, but not enough on its own);
 * - every line with a quantity is covered, unit for unit, by fulfillments that
 *   succeeded and whose latest shipment status is DELIVERED.
 *
 * Split shipments are summed per line. A fulfillment that is in transit,
 * picked up locally, cancelled or has no shipment status adds nothing, and
 * so does a missing fulfillment quantity. There is no fallback based on
 * elapsed time or estimated delivery dates.
 */
export function isOrderFullyDelivered(evidence: DeliveryEvidence): boolean {
  if (evidence.fulfillmentStatus !== 'FULFILLED') return false;

  const lines = evidence.lines.filter((line) => line.quantity > 0);
  if (lines.length === 0) return false;

  const delivered = new Map<string, number>();
  for (const fulfillment of evidence.fulfillments) {
    if (fulfillment.status !== 'SUCCESS') continue;
    if (fulfillment.latestShipmentStatus !== 'DELIVERED') continue;
    for (const item of fulfillment.items) {
      const quantity = item.quantity ?? 0;
      if (quantity <= 0) continue;
      delivered.set(
        item.lineItemId,
        (delivered.get(item.lineItemId) ?? 0) + quantity,
      );
    }
  }

  return lines.every(
    (line) => (delivered.get(line.id) ?? 0) >= line.quantity,
  );
}
