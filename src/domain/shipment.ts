import { ulid } from 'ulid';

export type ShipmentStatus = 'CREATED' | 'DISPATCHED' | 'DELIVERED';

export type Shipment = {
  id: string;
  orderId: string;
  customerId: string;
  lines: Array<{ sku: string; quantity: number }>;
  status: ShipmentStatus;
  trackingCode: string | null;
  carrier: string;
  updatedAt: Date;
};

export const CARRIER = 'Transportadora Simulada';

export function createShipment(orderId: string, customerId: string, lines: Shipment['lines'], now = new Date()): Shipment {
  return { id: `shp_${ulid()}`, orderId, customerId, lines, status: 'CREATED', trackingCode: null, carrier: CARRIER, updatedAt: now };
}

/** Código no formato de rastreio dos Correios (2 letras, 9 dígitos, BR), derivado do id. */
export function trackingCodeFor(shipmentId: string): string {
  const digits = [...shipmentId].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 1_000_000_000, 7);
  return `LG${String(digits).padStart(9, '0')}BR`;
}

/** Simulação da transportadora: avança um passo quando o tempo do estado atual passou. */
export function advance(s: Shipment, now: Date, dispatchAfterMs: number, deliverAfterMs: number): Shipment | null {
  const elapsed = now.getTime() - s.updatedAt.getTime();
  if (s.status === 'CREATED' && elapsed >= dispatchAfterMs) return { ...s, status: 'DISPATCHED', trackingCode: trackingCodeFor(s.id), updatedAt: now };
  if (s.status === 'DISPATCHED' && elapsed >= deliverAfterMs) return { ...s, status: 'DELIVERED', updatedAt: now };
  return null;
}
