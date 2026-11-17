import { describe, expect, it } from 'vitest';
import { advance, createShipment, trackingCodeFor } from '../src/domain/shipment.js';

describe('Shipment', () => {
  const t0 = new Date('2026-11-17T12:00:00Z');
  const at = (ms: number) => new Date(t0.getTime() + ms);
  const s = createShipment('ord_1', 'cus_1', [{ sku: 'A', quantity: 1 }], t0);

  it('despacha depois do prazo, com rastreio; entrega depois do segundo prazo', () => {
    expect(advance(s, at(7_999), 8_000, 15_000)).toBeNull();
    const dispatched = advance(s, at(8_000), 8_000, 15_000)!;
    expect(dispatched.status).toBe('DISPATCHED');
    expect(dispatched.trackingCode).toMatch(/^LG\d{9}BR$/);
    expect(advance(dispatched, at(20_000), 8_000, 15_000)).toBeNull();
    expect(advance(dispatched, at(23_000), 8_000, 15_000)?.status).toBe('DELIVERED');
  });

  it('rastreio é estável para a mesma remessa', () => {
    expect(trackingCodeFor('shp_X')).toBe(trackingCodeFor('shp_X'));
    expect(trackingCodeFor('shp_X')).not.toBe(trackingCodeFor('shp_Y'));
  });
});
