import type { CloudEvent } from '../chassis/cloudevent.js';
import { shipmentCreated, shipmentDelivered, shipmentDispatched } from './events.js';

export function contractSamples(): CloudEvent[] {
  const base = { shipmentId: 'shp_01JD3X7Q9Z8K2M4N6P8R0T2V50', orderId: 'ord_01JD3X7Q9Z8K2M4N6P8R0T2V4X', customerId: 'cus_guest_8f2a' };
  return [
    shipmentCreated({ ...base, lines: [{ sku: 'TEE-ONDASDOLAG-PRETO-M', quantity: 2 }] }),
    shipmentDispatched({ ...base, trackingCode: 'LGK7Q9Z8K2M4BR', carrier: 'Transportadora Simulada' }),
    shipmentDelivered(base),
  ];
}
