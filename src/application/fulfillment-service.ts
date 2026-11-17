import type { FastifyBaseLogger } from 'fastify';
import type { CloudEvent } from '../chassis/cloudevent.js';
import type { Db, Tx } from '../chassis/db.js';
import { enqueue } from '../chassis/outbox.js';
import { Consumed, ConsumedTypes as T, shipmentCreated, shipmentDelivered, shipmentDispatched, TOPIC } from '../contracts/events.js';
import { advance, createShipment, type Shipment } from '../domain/shipment.js';

type Row = { id: string; order_id: string; customer_id: string; lines: Shipment['lines']; status: Shipment['status']; tracking_code: string | null; carrier: string; updated_at: Date };
const toShipment = (r: Row): Shipment => ({
  id: r.id,
  orderId: r.order_id,
  customerId: r.customer_id,
  lines: r.lines,
  status: r.status,
  trackingCode: r.tracking_code,
  carrier: r.carrier,
  updatedAt: r.updated_at,
});

export type FulfillmentOptions = { dispatchAfterMs: number; deliverAfterMs: number };

export function createFulfillmentService(db: Db, logger: FastifyBaseLogger, options: FulfillmentOptions) {
  return {
    async byOrder(orderId: string) {
      const { rows } = await db.query<Row>('select * from shipments where order_id = $1', [orderId]);
      return rows.map(toShipment);
    },

    async handle(event: CloudEvent, tx: Tx) {
      if (event.type !== T.orderConfirmed) {
        logger.warn({ type: event.type }, 'tipo de evento não esperado');
        return;
      }
      const { orderId, customerId, lines } = Consumed.orderConfirmed.parse(event.data);
      const s = createShipment(orderId, customerId, lines);
      const inserted = await tx.query(
        `insert into shipments (id, order_id, customer_id, lines, status, carrier, updated_at) values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (order_id) do nothing`,
        [s.id, s.orderId, s.customerId, JSON.stringify(s.lines), s.status, s.carrier, s.updatedAt],
      );
      if (inserted.rowCount === 1) await enqueue(tx, TOPIC, shipmentCreated({ shipmentId: s.id, orderId, customerId, lines }, event));
    },

    /** Job: a "transportadora" despacha e entrega depois de um tempo. */
    async simulateCarrier() {
      await db.tx(async (tx) => {
        const { rows } = await tx.query<Row>(`select * from shipments where status <> 'DELIVERED' order by updated_at limit 50 for update skip locked`);
        const now = new Date();
        for (const row of rows) {
          const next = advance(toShipment(row), now, options.dispatchAfterMs, options.deliverAfterMs);
          if (!next) continue;
          await tx.query('update shipments set status = $2, tracking_code = $3, updated_at = $4 where id = $1', [next.id, next.status, next.trackingCode, next.updatedAt]);
          const base = { shipmentId: next.id, orderId: next.orderId, customerId: next.customerId };
          const event =
            next.status === 'DISPATCHED' ? shipmentDispatched({ ...base, trackingCode: next.trackingCode!, carrier: next.carrier }) : shipmentDelivered(base);
          await enqueue(tx, TOPIC, event);
        }
      });
    },
  };
}
