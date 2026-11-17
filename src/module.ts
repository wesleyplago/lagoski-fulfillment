import { z } from 'zod';
import type { ServiceModule } from './chassis/bootstrap.js';
import { readEnv } from './chassis/config.js';
import { createFulfillmentService } from './application/fulfillment-service.js';
import { migrations } from './infrastructure/migrations.js';
import { subscriptions } from './messaging-config.js';

export const fulfillmentModule: ServiceModule = {
  name: 'fulfillment',
  defaultPort: 8085,
  migrations,
  subscriptions,
  register({ app, db, logger }) {
    const fulfillment = createFulfillmentService(db, logger, {
      dispatchAfterMs: Number(readEnv('DISPATCH_AFTER_MS') ?? 8_000),
      deliverAfterMs: Number(readEnv('DELIVER_AFTER_MS') ?? 15_000),
    });

    app.get('/shipments', async (req) => {
      const { orderId } = z.object({ orderId: z.string() }).parse(req.query);
      return { shipments: await fulfillment.byOrder(orderId) };
    });

    return {
      handle: fulfillment.handle,
      jobs: [{ name: 'simulate-carrier', everyMs: 2_000, run: fulfillment.simulateCarrier }],
    };
  },
};
