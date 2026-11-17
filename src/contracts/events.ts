import { z } from 'zod';
import { newEvent, type CloudEvent } from '../chassis/cloudevent.js';

export const TOPIC = 'fulfillment.events';
const SOURCE = 'lagoski/fulfillment';

export const EventTypes = {
  shipmentCreated: 'lagoski.fulfillment.shipment.created.v1',
  shipmentDispatched: 'lagoski.fulfillment.shipment.dispatched.v1',
  shipmentDelivered: 'lagoski.fulfillment.shipment.delivered.v1',
} as const;

export type ShipmentCreatedV1 = { shipmentId: string; orderId: string; customerId: string; lines: Array<{ sku: string; quantity: number }> };
export type ShipmentDispatchedV1 = { shipmentId: string; orderId: string; customerId: string; trackingCode: string; carrier: string };
export type ShipmentDeliveredV1 = { shipmentId: string; orderId: string; customerId: string };

type Cause = Pick<CloudEvent, 'id' | 'traceparent'> | undefined;
const make = <T extends { orderId: string }>(type: string, data: T, causedBy?: Cause) =>
  newEvent({ source: SOURCE, type, subject: `order/${data.orderId}`, correlationId: data.orderId, causedBy, data });

export const shipmentCreated = (d: ShipmentCreatedV1, c?: Cause) => make(EventTypes.shipmentCreated, d, c);
export const shipmentDispatched = (d: ShipmentDispatchedV1, c?: Cause) => make(EventTypes.shipmentDispatched, d, c);
export const shipmentDelivered = (d: ShipmentDeliveredV1, c?: Cause) => make(EventTypes.shipmentDelivered, d, c);

export const Consumed = {
  orderConfirmed: z.object({
    orderId: z.string(),
    customerId: z.string(),
    lines: z.array(z.object({ sku: z.string(), quantity: z.number().int().positive() })).min(1),
  }),
};

export const ConsumedTypes = { orderConfirmed: 'lagoski.ordering.order.confirmed.v1' } as const;
